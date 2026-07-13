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
} from '@/lib/server';
import { toBindResponse, type FamilyBindRow, type FamilyBindUpdate } from '../_lib';

export const runtime = 'nodejs';

interface FamilyBindCreateRequest {
  bind_code?: unknown;
  relation?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);

    const body = (await request.json()) as FamilyBindCreateRequest;
    const { bind_code, relation } = body;

    if (typeof bind_code !== 'string' || bind_code.length === 0) {
      throw new ApiError(400, 'bind_code 必须为非空字符串');
    }
    if (typeof relation !== 'string' || relation.length === 0) {
      throw new ApiError(400, 'relation 必须为非空字符串');
    }

    const supabase = getSupabaseServerClient();

    // 查找 pending 绑定码记录
    const { data: lookupRows, error: lookupError } = await supabase
      .from('oc_elder_family_binds')
      .select('*')
      .eq('bind_code', bind_code)
      .eq('status', 'pending');

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

    const now = new Date().toISOString();
    const update_data: FamilyBindUpdate = {
      family_id: user_id,
      relation,
      status: 'active',
      can_view_health: true,
      can_edit_medication: false,
      can_receive_emergency: true,
      bound_at: now,
    };

    const { data: updatedRows, error: updateError } = await supabase
      .from('oc_elder_family_binds')
      .update(update_data)
      .eq('id', bindRecord.id)
      .select('*');

    if (updateError) {
      console.error('[POST /family/bind] 更新绑定失败:', updateError);
      throw new ApiError(500, '绑定失败');
    }

    if (!updatedRows || updatedRows.length === 0) {
      throw new ApiError(500, '绑定失败');
    }

    return NextResponse.json(toBindResponse(updatedRows[0] as FamilyBindRow));
  } catch (err) {
    return toApiResponse(err);
  }
}
