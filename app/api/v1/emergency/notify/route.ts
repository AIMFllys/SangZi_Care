// ============================================================
// POST /api/v1/emergency/notify
// ------------------------------------------------------------
// 对齐 backend/api/v1/emergency.py · notify_families
//   - 按 emergency_call_id 更新：notified_families=family_ids、
//     notification_sent_at=now
//   - 记录不存在 → 404
//   - 无真实电话/推送通道：与现网一致，仅写库（plan 10 §3）
//
// 权限：requireUser 鉴权。
//   与 plan 03 binds/[bind_id] 风格一致：仅 requireUser 鉴权，
//   不额外做归属校验（对齐 Python 现状）。
// 返回：EmergencyCallResponse
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import {
  toCallResponse,
  type EmergencyCallResponse,
  type EmergencyCallRow,
  type EmergencyCallUpdate,
} from '../_lib';

export const runtime = 'nodejs';

interface NotifyBody {
  emergency_call_id?: unknown;
  family_ids?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);

    const body = (await request.json().catch(() => null)) as NotifyBody | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    if (
      typeof body.emergency_call_id !== 'string' ||
      body.emergency_call_id.trim() === ''
    ) {
      throw new ApiError(400, 'emergency_call_id 不能为空');
    }
    const emergencyCallId = body.emergency_call_id;

    // family_ids 必填且为字符串数组
    if (!Array.isArray(body.family_ids)) {
      throw new ApiError(400, 'family_ids 必须为字符串数组');
    }
    const familyIds: string[] = [];
    for (const id of body.family_ids) {
      if (typeof id !== 'string' || id.trim() === '') {
        throw new ApiError(400, 'family_ids 必须为字符串数组');
      }
      familyIds.push(id);
    }

    const now = new Date().toISOString();
    const updateData: EmergencyCallUpdate = {
      notified_families: familyIds,
      notification_sent_at: now,
    };

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('emergency_calls')
      .update(updateData)
      .eq('id', emergencyCallId)
      .select('*');

    if (error) {
      console.error('[POST /emergency/notify] 更新失败:', error);
      throw new ApiError(500, '记录通知元数据失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(404, '紧急呼叫记录不存在');
    }

    return NextResponse.json<EmergencyCallResponse>(
      toCallResponse(data[0] as EmergencyCallRow),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
