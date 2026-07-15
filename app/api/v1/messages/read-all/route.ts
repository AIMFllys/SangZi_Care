import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import { resolveMessagePeer } from '../_lib';

export const runtime = 'nodejs';

interface ReadConversationBody {
  peer_id?: unknown;
}

export async function PATCH(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const body = (await request.json().catch(() => null)) as ReadConversationBody | null;
    if (!body || typeof body.peer_id !== 'string' || !body.peer_id.trim()) {
      throw new ApiError(400, 'peer_id 不能为空');
    }

    const peerId = body.peer_id.trim();
    const supabase = getSupabaseServerClient();
    await resolveMessagePeer(supabase, currentUserId, peerId);

    const { data, error } = await supabase
      .from('oc_elder_care_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('sender_id', peerId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)
      .select('id');

    if (error) {
      console.error('[PATCH /messages/read-all] 更新失败');
      throw new ApiError(500, '标记会话已读失败');
    }

    return withPrivateNoStore(NextResponse.json({ count: data?.length ?? 0 }));
  } catch (error) {
    return withPrivateNoStore(toApiResponse(error));
  }
}
