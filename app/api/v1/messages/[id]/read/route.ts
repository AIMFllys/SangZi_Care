// ============================================================
// PATCH /api/v1/messages/{message_id}/read
// ------------------------------------------------------------
// 对齐 backend/api/v1/messages.py · mark_as_read
//   - 标记消息为已读；仅 receiver_id == 当前用户可标记
//   - 消息不存在 → 404；非接收者 → 403
// 返回：MessageResponse
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import {
  assertSafeId,
  toMessageResponse,
  type MessageResponse,
  type MessageRow,
} from '../../_lib';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const { id: messageId } = await params;

    if (!messageId) {
      throw new ApiError(400, 'message_id 不能为空');
    }
    assertSafeId(messageId, 'message_id');

    const supabase = getSupabaseServerClient();

    // 先查消息存在性 + 校验接收者（对齐 Python）
    const { data: existing, error: selectErr } = await supabase
      .from('oc_elder_care_messages')
      .select('*')
      .eq('id', messageId)
      .limit(1);

    if (selectErr) {
      console.error('[PATCH /messages/:id/read] 查询失败:', selectErr);
      throw new ApiError(500, '标记已读失败');
    }
    if (!existing || existing.length === 0) {
      throw new ApiError(404, '消息不存在');
    }

    const message = existing[0] as MessageRow;
    if (message.receiver_id !== currentUserId) {
      throw new ApiError(403, '只有消息接收者可以标记已读');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('oc_elder_care_messages')
      .update({ is_read: true, read_at: now })
      .eq('id', messageId)
      .select('*');

    if (error) {
      console.error('[PATCH /messages/:id/read] 更新失败:', error);
      throw new ApiError(500, '标记已读失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(500, '标记已读失败');
    }

    return NextResponse.json<MessageResponse>(
      toMessageResponse(data[0] as MessageRow),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
