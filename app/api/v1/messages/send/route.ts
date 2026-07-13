// ============================================================
// POST /api/v1/messages/send
// ------------------------------------------------------------
// 对齐 backend/api/v1/messages.py · send_message
//   - 发送文字消息；sender_id 从 JWT 取，不信任 body.sender_id
//   - type 固定 "text"
//   - 跨用户校验：与 receiver_id 需存在 active 家庭绑定（plan 06 增强）
// 返回：MessageResponse(201)
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
  resolveMessagePeer,
  toMessageResponse,
  type MessageInsert,
  type MessageResponse,
  type MessageRow,
} from '../_lib';

export const runtime = 'nodejs';

interface SendMessageBody {
  receiver_id?: unknown;
  content?: unknown;
  is_ai_generated?: unknown;
  // sender_id / type 由客户端传入；对齐 Python：忽略，以 JWT / 固定值为准
  sender_id?: unknown;
  type?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body =
      (await request.json().catch(() => null)) as SendMessageBody | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    const receiverId = body.receiver_id;
    if (typeof receiverId !== 'string' || receiverId.trim() === '') {
      throw new ApiError(400, 'receiver_id 不能为空');
    }

    // 对齐 Python：content 可选（Optional[str] = None）
    const content =
      body.content === undefined || body.content === null
        ? null
        : typeof body.content === 'string'
          ? body.content
          : null;

    const isAiGenerated =
      typeof body.is_ai_generated === 'boolean' ? body.is_ai_generated : false;

    const supabase = getSupabaseServerClient();
    await resolveMessagePeer(supabase, currentUserId, receiverId);

    const now = new Date().toISOString();
    const record: MessageInsert = {
      sender_id: currentUserId,
      receiver_id: receiverId,
      type: 'text',
      content,
      is_ai_generated: isAiGenerated,
      is_read: false,
      created_at: now,
    };

    const { data, error } = await supabase
      .from('oc_elder_care_messages')
      .insert(record)
      .select('*');

    if (error) {
      console.error('[POST /messages/send] 插入失败:', error);
      throw new ApiError(500, '发送消息失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(500, '发送消息失败');
    }

    return withPrivateNoStore(
      NextResponse.json<MessageResponse>(
        toMessageResponse(data[0] as MessageRow),
        { status: 201 },
      ),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
