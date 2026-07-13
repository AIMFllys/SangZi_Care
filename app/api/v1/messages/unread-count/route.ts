// ============================================================
// GET /api/v1/messages/unread-count
// ------------------------------------------------------------
// 对齐 backend/api/v1/messages.py · get_unread_count
//   返回当前用户作为 receiver 的未读消息数。
// 返回：{ count: number }
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';

export const runtime = 'nodejs';

interface UnreadCountResponse {
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const supabase = getSupabaseServerClient();
    const { count, error } = await supabase
      .from('oc_elder_care_messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', currentUserId)
      .eq('is_read', false);

    if (error) {
      console.error('[GET /messages/unread-count] 查询失败:', error);
      throw new ApiError(500, '获取未读消息数失败');
    }

    return NextResponse.json<UnreadCountResponse>({
      count: count ?? 0,
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
