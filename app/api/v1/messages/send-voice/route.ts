// ============================================================
// POST /api/v1/messages/send-voice
// ------------------------------------------------------------
// 对齐 backend/api/v1/messages.py · send_voice_message
//   - 发送语音消息；sender_id 从 JWT 取
//   - type 固定 "voice"
//   - 跨用户校验：与 receiver_id 需存在 active 家庭绑定（plan 06 增强）
// 返回：MessageResponse(201)
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import {
  resolveMessagePeer,
  toMessageResponse,
  type MessageInsert,
  type MessageResponse,
  type MessageRow,
} from '../_lib';

export const runtime = 'nodejs';

interface SendVoiceMessageBody {
  receiver_id?: unknown;
  content?: unknown;
  audio_url?: unknown;
  audio_duration?: unknown;
  is_ai_generated?: unknown;
  sender_id?: unknown;
  type?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body =
      (await request.json().catch(() => null)) as
        | SendVoiceMessageBody
        | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    const receiverId = body.receiver_id;
    if (typeof receiverId !== 'string' || receiverId.trim() === '') {
      throw new ApiError(400, 'receiver_id 不能为空');
    }

    const content =
      body.content === undefined || body.content === null
        ? null
        : typeof body.content === 'string'
          ? body.content
          : null;

    const audioUrl =
      typeof body.audio_url === 'string' ? body.audio_url : null;

    const audioDuration =
      typeof body.audio_duration === 'number' &&
      Number.isFinite(body.audio_duration)
        ? body.audio_duration
        : null;

    const isAiGenerated =
      typeof body.is_ai_generated === 'boolean' ? body.is_ai_generated : false;

    const supabase = getSupabaseServerClient();
    await resolveMessagePeer(supabase, currentUserId, receiverId);

    const now = new Date().toISOString();
    const record: MessageInsert = {
      sender_id: currentUserId,
      receiver_id: receiverId,
      type: 'voice',
      content,
      audio_url: audioUrl,
      audio_duration: audioDuration,
      is_ai_generated: isAiGenerated,
      is_read: false,
      created_at: now,
    };

    const { data, error } = await supabase
      .from('elder_care_messages')
      .insert(record)
      .select('*');

    if (error) {
      console.error('[POST /messages/send-voice] 插入失败:', error);
      throw new ApiError(500, '发送语音消息失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(500, '发送语音消息失败');
    }

    return NextResponse.json<MessageResponse>(
      toMessageResponse(data[0] as MessageRow),
      { status: 201 },
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
