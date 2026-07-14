// ============================================================
// POST /api/v1/family/bind
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · bind_family
// 家属端凭绑定码建立关系：
//   1. 查找 status='pending' 的绑定码记录
//   2. 禁止自绑定（elder_id == 当前 family_id）
//   3. 回填 family_id / relation / status='active' / 默认权限
// body: { bind_code: string, relation: string }
// 返回：FamilyBindResponse
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import { isElderRelation } from '@/lib/familyRelations';
import {
  assertExpectedRole,
  getDatabaseUserRole,
  toBindResponse,
  type FamilyBindRow,
  type FamilyBindUpdate,
} from '../_lib';

export const runtime = 'nodejs';

const BIND_ATTEMPT_WINDOW_SECONDS = 10 * 60;
const BIND_MAX_ATTEMPTS = 5;
const BIND_LOCK_SECONDS = 15 * 60;

interface BindAttemptResult {
  status: 'allowed' | 'rate_limited';
  retry_after?: number;
}

interface FamilyBindCreateRequest {
  bind_code?: unknown;
  relation?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);

    const body = (await request.json()) as FamilyBindCreateRequest;
    const { bind_code, relation } = body;

    if (typeof bind_code !== 'string' || !/^\d{6}$/.test(bind_code)) {
      throw new ApiError(400, 'bind_code 必须为 6 位数字');
    }
    if (typeof relation !== 'string' || !isElderRelation(relation)) {
      throw new ApiError(400, '请选择有效的长辈关系');
    }

    const supabase = getSupabaseServerClient();
    const role = await getDatabaseUserRole(supabase, user_id);
    assertExpectedRole(role, 'family');
    const now = new Date().toISOString();

    // 每次有效格式的兑码都先在数据库原子占用一次尝试额度；该限制跨
    // EdgeOne 实例生效，避免 6 位码被单个家属账号在线枚举。
    const { data: attemptData, error: attemptError } = await supabase.rpc(
      'oc_reserve_family_bind_attempt',
      {
        p_family_id: user_id,
        p_window_seconds: BIND_ATTEMPT_WINDOW_SECONDS,
        p_max_attempts: BIND_MAX_ATTEMPTS,
        p_lock_seconds: BIND_LOCK_SECONDS,
      },
    );
    if (attemptError) {
      console.error('[POST /family/bind] 绑定尝试限流失败:', attemptError);
      throw new ApiError(500, '绑定失败');
    }
    const attempt = attemptData as BindAttemptResult | null;
    if (attempt?.status === 'rate_limited') {
      const retryAfter = Math.max(1, Math.ceil(attempt.retry_after ?? BIND_LOCK_SECONDS));
      throw new ApiError(429, `尝试次数过多，请${retryAfter}秒后再试`);
    }
    if (attempt?.status !== 'allowed') {
      throw new ApiError(500, '绑定失败');
    }

    // 查找 pending 绑定码记录
    const { data: lookupRows, error: lookupError } = await supabase
      .from('oc_elder_family_binds')
      .select('*')
      .eq('bind_code', bind_code)
      .eq('status', 'pending')
      .gt('expires_at', now)
      .limit(1);

    if (lookupError) {
      console.error('[POST /family/bind] 查询绑定码失败:', lookupError);
      throw new ApiError(500, '绑定失败');
    }

    if (!lookupRows || lookupRows.length === 0) {
      throw new ApiError(404, '绑定码无效或已使用');
    }

    const bindRecord = lookupRows[0] as FamilyBindRow;

    // 禁止自绑定
    if (bindRecord.elder_id === user_id) {
      throw new ApiError(400, '不能绑定自己');
    }

    const { data: existing, error: existingError } = await supabase
      .from('oc_elder_family_binds')
      .select('id')
      .eq('elder_id', bindRecord.elder_id)
      .eq('family_id', user_id)
      .eq('status', 'active')
      .limit(1);
    if (existingError) {
      console.error('[POST /family/bind] 重复绑定校验失败:', existingError);
      throw new ApiError(500, '绑定失败');
    }
    if (existing && existing.length > 0) {
      throw new ApiError(409, '您已绑定这位长辈');
    }

    const update_data: FamilyBindUpdate = {
      family_id: user_id,
      relation,
      status: 'active',
      bind_code: null,
      can_view_health: true,
      can_edit_health: true,
      can_edit_medication: true,
      can_receive_emergency: true,
      bound_at: now,
    };

    const { data: updatedRows, error: updateError } = await supabase
      .from('oc_elder_family_binds')
      .update(update_data)
      .eq('id', bindRecord.id)
      .eq('status', 'pending')
      .is('family_id', null)
      .gt('expires_at', now)
      .select('*');

    if (updateError) {
      console.error('[POST /family/bind] 更新绑定失败:', updateError);
      throw new ApiError(500, '绑定失败');
    }

    if (!updatedRows || updatedRows.length === 0) {
      throw new ApiError(409, '绑定码已被使用，请重新获取');
    }

    const { data: peerRows, error: peerError } = await supabase
      .from('oc_users')
      .select('id, name, phone, avatar_url, last_active_at, role')
      .eq('id', bindRecord.elder_id)
      .limit(1);
    if (peerError) {
      console.error('[POST /family/bind] 查询长辈资料失败:', peerError);
    }

    const { error: clearLimitError } = await supabase
      .from('oc_family_bind_attempt_limits')
      .delete()
      .eq('family_id', user_id);
    if (clearLimitError) {
      // 绑定本身已成功；限流记录会自行过期，不因此回滚关系。
      console.error('[POST /family/bind] 清理绑定尝试记录失败:', clearLimitError);
    }

    return withPrivateNoStore(
      NextResponse.json(toBindResponse(
        updatedRows[0] as FamilyBindRow,
        peerError ? null : peerRows?.[0] ?? null,
      )),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
