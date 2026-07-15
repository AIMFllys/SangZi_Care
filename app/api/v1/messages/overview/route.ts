import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import type { MessageCategory, MessageResponse } from '../_lib';

export const runtime = 'nodejs';

interface ConversationOverviewResponse {
  peer_id: string;
  last_message: MessageResponse;
  unread_count: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOverview(value: unknown): ConversationOverviewResponse[] {
  if (!Array.isArray(value)) throw new ApiError(500, '消息概览响应无效');
  return value.map((item) => {
    if (!isRecord(item) || typeof item.peer_id !== 'string' || !isRecord(item.last_message)) {
      throw new ApiError(500, '消息概览响应无效');
    }
    const message = item.last_message;
    if (
      typeof message.id !== 'string'
      || typeof message.sender_id !== 'string'
      || typeof message.receiver_id !== 'string'
      || typeof message.type !== 'string'
    ) {
      throw new ApiError(500, '消息概览响应无效');
    }
    const unreadCount = Number(item.unread_count);
    if (!Number.isSafeInteger(unreadCount) || unreadCount < 0) {
      throw new ApiError(500, '消息概览响应无效');
    }

    return {
      peer_id: item.peer_id,
      unread_count: unreadCount,
      last_message: {
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        type: message.type,
        category: (typeof message.category === 'string' ? message.category : 'chat') as MessageCategory,
        content: typeof message.content === 'string' ? message.content : null,
        audio_url: null,
        audio_duration: typeof message.audio_duration === 'number' ? message.audio_duration : null,
        is_ai_generated: typeof message.is_ai_generated === 'boolean' ? message.is_ai_generated : null,
        is_read: typeof message.is_read === 'boolean' ? message.is_read : null,
        read_at: typeof message.read_at === 'string' ? message.read_at : null,
        created_at: typeof message.created_at === 'string' ? message.created_at : null,
      },
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc('oc_get_message_overview', {
      p_user_id: currentUserId,
    });
    if (error) {
      console.error('[GET /messages/overview] 聚合失败');
      throw new ApiError(500, '获取消息概览失败');
    }

    return withPrivateNoStore(
      NextResponse.json<ConversationOverviewResponse[]>(parseOverview(data)),
    );
  } catch (error) {
    return withPrivateNoStore(toApiResponse(error));
  }
}
