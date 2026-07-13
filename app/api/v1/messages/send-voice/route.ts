import { NextResponse, type NextRequest } from 'next/server';
import { getCanonicalPcm16MonoWavDurationMs } from '@/lib/audio/wav';
import {
  ApiError,
  buildVoiceObjectPath,
  getSupabaseServerClient,
  removeVoiceObject,
  requireUser,
  toApiResponse,
  uploadVoiceObject,
} from '@/lib/server';
import {
  resolveMessagePeer,
  toPlayableMessageResponse,
  type MessageInsert,
  type MessageResponse,
  type MessageRow,
} from '../_lib';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_TRANSCRIPT_CODE_POINTS = 1_000;
const DURATION_TOLERANCE_MS = 1_000;
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Authorization',
};

async function bestEffortRemove(
  client: ReturnType<typeof getSupabaseServerClient>,
  path: string,
): Promise<void> {
  try {
    await removeVoiceObject(client, path);
  } catch {
    // 数据库失败是主错误；孤儿对象交给运维清理，不覆盖原始响应。
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('multipart/form-data')) {
      throw new ApiError(400, '请求体必须为 multipart/form-data');
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ApiError(400, '请求体必须为 multipart/form-data');
    }

    const receiverId = formData.get('receiver_id');
    const rawContent = formData.get('content');
    const rawDurationMs = formData.get('duration_ms');
    const file = formData.get('file');

    if (typeof receiverId !== 'string' || !receiverId.trim()) {
      throw new ApiError(400, 'receiver_id 不能为空');
    }
    const transcript = typeof rawContent === 'string' ? rawContent.trim() : '';
    if (!transcript || Array.from(transcript).length > MAX_TRANSCRIPT_CODE_POINTS) {
      throw new ApiError(400, '语音转写不能为空且不能超过 1000 字');
    }
    if (typeof rawDurationMs !== 'string' || !/^\d+$/.test(rawDurationMs.trim())) {
      throw new ApiError(400, 'duration_ms 必须为整数');
    }
    const durationMs = Number(rawDurationMs);
    if (durationMs <= 0 || durationMs > 60_000) {
      throw new ApiError(400, '录音时长必须在 1-60000 毫秒之间');
    }
    if (!(file instanceof File)) {
      throw new ApiError(400, '缺少 WAV 录音文件');
    }
    if (file.size === 0) throw new ApiError(400, '录音文件为空');
    if (file.size > MAX_AUDIO_BYTES) throw new ApiError(413, '录音文件不能超过 5 MiB');
    if (file.type.toLowerCase() !== 'audio/wav') {
      throw new ApiError(400, '语音消息只接受 audio/wav');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pcmDurationMs = getCanonicalPcm16MonoWavDurationMs(bytes);
    if (pcmDurationMs === null) {
      throw new ApiError(400, 'WAV 文件必须为 16kHz 单声道 PCM16LE');
    }
    if (
      pcmDurationMs < 1
      || pcmDurationMs > 60_000
      || Math.abs(pcmDurationMs - durationMs) > DURATION_TOLERANCE_MS
    ) {
      throw new ApiError(400, '录音时长与 WAV 音频不一致');
    }

    const supabase = getSupabaseServerClient();
    const normalizedReceiverId = receiverId.trim();
    await resolveMessagePeer(supabase, currentUserId, normalizedReceiverId);

    const objectPath = buildVoiceObjectPath(currentUserId, 'messages');
    await uploadVoiceObject(supabase, objectPath, bytes, 'audio/wav');

    const record: MessageInsert = {
      sender_id: currentUserId,
      receiver_id: normalizedReceiverId,
      type: 'voice',
      content: transcript,
      audio_url: objectPath,
      audio_duration: pcmDurationMs / 1_000,
      is_ai_generated: false,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    let result: { data: unknown; error: unknown };
    try {
      result = await supabase
        .from('oc_elder_care_messages')
        .insert(record)
        .select('*');
    } catch {
      await bestEffortRemove(supabase, objectPath);
      throw new ApiError(500, '发送语音消息失败');
    }

    const rows = (result.data ?? []) as MessageRow[];
    if (result.error || rows.length === 0) {
      await bestEffortRemove(supabase, objectPath);
      throw new ApiError(500, '发送语音消息失败');
    }

    return NextResponse.json<MessageResponse>(
      toPlayableMessageResponse(rows[0]),
      { status: 201, headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    return toApiResponse(error);
  }
}
