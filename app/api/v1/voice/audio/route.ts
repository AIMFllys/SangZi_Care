import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  assertVoiceObjectPath,
  createSignedVoiceUrl,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { assertSafeId } from '../../messages/_lib';
import { withPrivateNoStore } from '../../_http';

export const runtime = 'nodejs';

interface VoiceMessageAccessRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: string;
  audio_url: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const messageId = new URL(request.url).searchParams.get('message_id') ?? '';
    assertSafeId(messageId, 'message_id');

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('oc_elder_care_messages')
      .select('id,sender_id,receiver_id,type,audio_url')
      .eq('id', messageId)
      .maybeSingle();

    if (error) throw new ApiError(500, '读取语音消息失败');
    if (!data) throw new ApiError(404, '语音消息不存在');

    const row = data as VoiceMessageAccessRow;
    if (row.sender_id !== currentUserId && row.receiver_id !== currentUserId) {
      throw new ApiError(403, '无权播放该语音消息');
    }
    if (row.type !== 'voice' || !row.audio_url) {
      throw new ApiError(404, '语音文件不存在');
    }

    try {
      assertVoiceObjectPath(row.audio_url, row.sender_id, 'messages');
    } catch {
      throw new ApiError(404, '语音文件不存在');
    }

    const signedUrl = await createSignedVoiceUrl(supabase, row.audio_url);
    return withPrivateNoStore(new NextResponse(null, {
      status: 307,
      headers: {
        Location: signedUrl,
      },
    }));
  } catch (error) {
    return withPrivateNoStore(toApiResponse(error));
  }
}
