// ============================================================
// POST /api/v1/voice/tts
// ------------------------------------------------------------
// 对齐 backend/api/v1/ai_voice.py · text_to_speech
//   1. requireUser 鉴权
//   2. body: { text: string, speed?: number }
//      - text 长度 1-5000
//      - speed 范围 0.5-2.0，默认 1.0
//   3. 调用 voice.textToSpeech（未配置火山 Key 时服务端降级占位静音帧，不 500）
//   4. 返回 audio/mpeg 二进制流 + Content-Disposition
//
// 响应：
//   200  audio/mpeg（body 为 MP3 字节）
//   400  { detail }  校验失败
//   500  { detail: "语音合成服务暂时不可用" }
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { textToSpeech } from '@/lib/server/voice';

export const runtime = 'nodejs';

interface TtsRequestBody {
  text?: unknown;
  speed?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    // 鉴权（对齐 Python Depends(require_auth)）
    await requireUser(request);

    // 解析 JSON body
    const body = (await request
      .json()
      .catch(() => null)) as TtsRequestBody | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    // text 校验
    const { text } = body;
    if (typeof text !== 'string' || text.length === 0) {
      throw new ApiError(400, 'text 不能为空');
    }
    if (text.length > 5000) {
      throw new ApiError(400, 'text 长度不能超过 5000');
    }

    // speed 校验（默认 1.0）
    let speed = 1.0;
    if (body.speed !== undefined && body.speed !== null) {
      if (typeof body.speed !== 'number' || Number.isNaN(body.speed)) {
        throw new ApiError(400, 'speed 必须为数字');
      }
      speed = body.speed;
      if (speed < 0.5 || speed > 2.0) {
        throw new ApiError(400, 'speed 必须在 0.5 到 2.0 之间');
      }
    }

    // 调用语音合成服务（占位实现返回静音 MP3 帧）
    let audioBytes: Uint8Array;
    try {
      audioBytes = await textToSpeech(text, speed);
    } catch (err) {
      console.error('[POST /voice/tts] TTS service error:', err);
      throw new ApiError(500, '语音合成服务暂时不可用');
    }

    // 返回二进制音频流（不能用 NextResponse.json）。
    // TS 5.7 起 Uint8Array 为泛型类型，与 DOM BodyInit 联合类型推断存在已知摩擦，
    // 此处用类型断言安全传入 NextResponse 构造器（运行时仍是原始字节）。
    return new NextResponse(audioBytes as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename=tts_output.mp3',
        'Content-Length': String(audioBytes.byteLength),
      },
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
