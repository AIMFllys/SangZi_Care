import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  requireUser,
  transcribeSpeech,
  type MimoAudioFormat,
} from '@/lib/server';
import {
  createVoiceRequestContext,
  finishVoiceResponse,
  voiceErrorResponse,
} from '../_shared';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MIME_FORMATS = new Map<string, MimoAudioFormat>([
  ['audio/wav', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
]);

function detectAudioFormat(bytes: Uint8Array): MimoAudioFormat | null {
  const wav =
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45;
  const mp3 =
    (bytes.byteLength >= 3 &&
      bytes[0] === 0x49 &&
      bytes[1] === 0x44 &&
      bytes[2] === 0x33) ||
    (bytes.byteLength >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  return wav ? 'wav' : mp3 ? 'mp3' : null;
}

export async function POST(request: NextRequest) {
  const context = createVoiceRequestContext('asr');
  let audioBytes = 0;

  try {
    await requireUser(request);

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

    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ApiError(400, '缺少 file 字段或字段不是文件');
    }
    audioBytes = file.size;
    if (audioBytes === 0) {
      throw new ApiError(400, '上传的音频文件为空');
    }
    if (audioBytes > MAX_AUDIO_BYTES) {
      throw new ApiError(413, '音频文件不能超过 5 MiB');
    }

    const declaredFormat = MIME_FORMATS.get(file.type.toLowerCase());
    if (!declaredFormat) {
      throw new ApiError(400, `不支持的音频格式: ${file.type || 'unknown'}`);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedFormat = detectAudioFormat(bytes);
    if (!detectedFormat || detectedFormat !== declaredFormat) {
      throw new ApiError(400, '音频 MIME 与文件内容不匹配');
    }

    const text = await transcribeSpeech(bytes, detectedFormat);
    return finishVoiceResponse(
      NextResponse.json({ text }, { status: 200 }),
      context,
      { audioBytes },
    );
  } catch (error) {
    return finishVoiceResponse(
      voiceErrorResponse(error),
      context,
      { audioBytes },
    );
  }
}
