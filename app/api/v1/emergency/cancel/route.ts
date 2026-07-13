// ============================================================
// POST /api/v1/emergency/cancel
// ------------------------------------------------------------
// 对齐 backend/api/v1/emergency.py · cancel_emergency
//   - 按 emergency_call_id 更新：status='cancelled'、cancelled_by、
//     ended_at；可选 cancel_reason
//   - 记录不存在 → 404
//
// 权限：requireUser 鉴权；cancelled_by 取 current_user.user_id。
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
  withPrivateNoStore,
} from '@/lib/server';
import {
  toCallResponse,
  type EmergencyCallResponse,
  type EmergencyCallRow,
  type EmergencyCallUpdate,
} from '../_lib';

export const runtime = 'nodejs';

interface CancelBody {
  emergency_call_id?: unknown;
  reason?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body = (await request.json().catch(() => null)) as CancelBody | null;
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

    // reason 可选；若提供必须为字符串
    let reason: string | null = null;
    if (body.reason !== undefined && body.reason !== null) {
      if (typeof body.reason !== 'string') {
        throw new ApiError(400, 'reason 必须为字符串');
      }
      reason = body.reason;
    }

    const now = new Date().toISOString();
    const updateData: EmergencyCallUpdate = {
      status: 'cancelled',
      cancelled_by: currentUserId,
      ended_at: now,
    };
    if (reason !== null) {
      updateData.cancel_reason = reason;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('oc_emergency_calls')
      .update(updateData)
      .eq('id', emergencyCallId)
      .select('*');

    if (error) {
      console.error('[POST /emergency/cancel] 更新失败:', error);
      throw new ApiError(500, '取消紧急呼叫失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(404, '紧急呼叫记录不存在');
    }

    return withPrivateNoStore(
      NextResponse.json<EmergencyCallResponse>(
        toCallResponse(data[0] as EmergencyCallRow),
      ),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
