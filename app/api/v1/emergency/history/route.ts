// ============================================================
// GET /api/v1/emergency/history
// ------------------------------------------------------------
// 对齐 backend/api/v1/emergency.py · get_history
//   - 查询当前用户的紧急呼叫历史，按 created_at 倒序
//   - limit query 参数：1–100，默认 20
//
// 权限：requireUser 鉴权；仅返回 current_user 的记录。
// 返回：EmergencyCallResponse[]
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
} from '../_lib';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const params = request.nextUrl.searchParams;
    const limitParam = params.get('limit');
    let limit = 20;
    if (limitParam !== null) {
      const parsed = Number(limitParam);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        throw new ApiError(400, 'limit 必须为整数');
      }
      if (parsed < 1 || parsed > 100) {
        throw new ApiError(400, 'limit 必须为 1–100 之间的整数');
      }
      limit = parsed;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('emergency_calls')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[GET /emergency/history] 查询失败:', error);
      throw new ApiError(500, '获取紧急呼叫历史失败');
    }

    const rows = (data ?? []) as EmergencyCallRow[];
    return NextResponse.json<EmergencyCallResponse[]>(
      rows.map(toCallResponse),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
