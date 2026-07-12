// ============================================================
// POST /api/v1/emergency/trigger
// ------------------------------------------------------------
// 对齐 backend/api/v1/emergency.py · trigger_emergency
//   1. 在 emergency_calls 表创建记录（status='triggered'）
//   2. 查询当前用户（elder）的 active 绑定中可接收紧急通知的家属
//   3. 将家属信息写入 notified_families / called_contacts
//
// 修复项（plan 10 §3）：
//   - 通知对象解析使用 elder_family_binds.can_receive_emergency 布尔列，
//     不是 Python 代码里假设的 permissions.receive_emergency_notifications
//     JSON 字段（types/supabase.ts 为准）。
//   - 关系字段使用 elder_family_binds.relation（非 Python 假设的 relationship）。
//   - elder_id 取 current_user.user_id（忽略 body.user_id，对齐 Python 实际行为）
//
// 权限：requireUser 鉴权；elder 本人触发。
// 返回：EmergencyCallResponse（200，对齐 Python 默认）
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import type { Json } from '@/types/supabase';
import {
  toCallResponse,
  type CalledContactEntry,
  type EmergencyCallInsert,
  type EmergencyCallResponse,
  type EmergencyCallRow,
} from '../_lib';

export const runtime = 'nodejs';

interface TriggerBody {
  user_id?: unknown;
  trigger_method?: unknown;
  location?: unknown;
}

interface BindRow {
  family_id: string | null;
  relation: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body = (await request.json().catch(() => null)) as TriggerBody | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    // trigger_method 必填（button | voice）
    if (
      typeof body.trigger_method !== 'string' ||
      body.trigger_method.trim() === ''
    ) {
      throw new ApiError(400, 'trigger_method 不能为空');
    }
    const triggerMethod = body.trigger_method;

    // location 可选；若提供必须为对象
    let location: Json | null = null;
    if (body.location !== undefined && body.location !== null) {
      if (
        typeof body.location !== 'object' ||
        Array.isArray(body.location)
      ) {
        throw new ApiError(400, 'location 必须为对象');
      }
      location = body.location as Json;
    }

    const supabase = getSupabaseServerClient();

    // 查询当前 elder 的 active 绑定中可接收紧急通知的家属
    // 修复项：使用 can_receive_emergency 布尔列（types/supabase.ts 为准）
    const { data: bindsData, error: bindsError } = await supabase
      .from('elder_family_binds')
      .select('family_id, relation')
      .eq('elder_id', currentUserId)
      .eq('status', 'active')
      .eq('can_receive_emergency', true);

    if (bindsError) {
      console.error('[POST /emergency/trigger] 查询绑定失败:', bindsError);
      throw new ApiError(500, '触发紧急呼叫失败');
    }

    const binds = (bindsData ?? []) as BindRow[];
    const notifiedFamilyIds: string[] = [];
    const calledContacts: Record<string, CalledContactEntry> = {};
    for (const bind of binds) {
      if (!bind.family_id) continue;
      const familyId = bind.family_id;
      notifiedFamilyIds.push(familyId);
      calledContacts[familyId] = {
        relation: bind.relation,
        family_id: familyId,
      };
    }

    const now = new Date().toISOString();
    const record: EmergencyCallInsert = {
      user_id: currentUserId,
      trigger_method: triggerMethod,
      status: 'triggered',
      triggered_at: now,
      notified_families: notifiedFamilyIds,
      called_contacts: calledContacts as unknown as Json,
      called_numbers: [],
      ...(location !== null ? { location } : {}),
    };

    const { data, error } = await supabase
      .from('emergency_calls')
      .insert(record)
      .select('*');

    if (error) {
      console.error('[POST /emergency/trigger] 创建失败:', error);
      throw new ApiError(500, '创建紧急呼叫记录失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(500, '创建紧急呼叫记录失败');
    }

    return NextResponse.json<EmergencyCallResponse>(
      toCallResponse(data[0] as EmergencyCallRow),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
