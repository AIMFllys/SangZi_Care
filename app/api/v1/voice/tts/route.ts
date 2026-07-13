import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  requireUser,
  synthesizeSpeech,
} from '@/lib/server';
import {
  createVoiceRequestContext,
  finishVoiceResponse,
  voiceErrorResponse,
} from '../_shared';

export const runtime = 'nodejs';

const MAX_TEXT_CHARACTERS = 1_000;

interface TtsRequestBody {
  text?: unknown;
  /** 迁移期兼容字段；MiMo 不接收结构化 speed。 */
  speed?: unknown;
}

export async function POST(request: NextRequest) {
  const context = createVoiceRequestContext('tts');
  let textLength = 0;

  try {
    await requireUser(request);

    const body = (await request.json().catch(() => null)) as TtsRequestBody | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    if (typeof body.text !== 'string' || body.text.trim() === '') {
      throw new ApiError(400, 'text 不能为空');
    }
    const text = body.text.trim();
    textLength = Array.from(text).length;
    if (textLength > MAX_TEXT_CHARACTERS) {
      throw new ApiError(400, 'text 长度不能超过 1000 个字符');
    }

    if (body.speed !== undefined) {
      if (
        typeof body.speed !== 'number' ||
        !Number.isFinite(body.speed) ||
        body.speed < 0.5 ||
        body.speed > 2
      ) {
        throw new ApiError(400, 'speed 必须为 0.5 到 2.0 之间的数字');
      }
    }

    const audio = await synthesizeSpeech(text);
    return finishVoiceResponse(
      new NextResponse(audio.bytes as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': audio.contentType,
          'Content-Disposition': 'inline; filename=tts_output.mp3',
          'Content-Length': String(audio.bytes.byteLength),
        },
      }),
      context,
      { textLength },
    );
  } catch (error) {
    return finishVoiceResponse(
      voiceErrorResponse(error),
      context,
      { textLength },
    );
  }
}
