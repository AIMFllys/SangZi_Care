// ============================================================
// POST /api/v1/voice/transcribe
// ------------------------------------------------------------
// 对齐 backend/api/v1/ai_voice.py · transcribe_audio
//   1. requireUser 鉴权
//   2. multipart/form-data，字段 file（音频文件 mp3/wav/pcm/webm/ogg）
//   3. 宽松 content_type 校验（对齐 Python allowed_types 集合）
//   4. 空文件 → 400
//   5. 调用 voice.transcribeFile（未配置火山 Key 时服务端降级占位文案，不 500）
//
// 响应：
//   200  { text: string }
//   400  { detail }  校验失败
//   500  { detail: "语音转写服务暂时不可用" }
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { transcribeFile } from '@/lib/server/voice';

export const runtime = 'nodejs';

/** 允许的音频 content_type 集合（对齐 Python allowed_types）。 */
const ALLOWED_CONTENT_TYPES = new Set<string>([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/pcm',
  'audio/webm',
  'audio/ogg',
  'application/octet-stream',
]);

export async function POST(request: NextRequest) {
  try {
    // 鉴权（对齐 Python Depends(require_auth)）
    await requireUser(request);

    // 解析 multipart/form-data
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

    // 宽松 content_type 校验
    const contentType = (file.type || 'application/octet-stream').toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new ApiError(400, `不支持的音频格式: ${contentType}`);
    }

    // 读取字节并校验非空
    const arrayBuffer = await file.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);
    if (audioData.byteLength === 0) {
      throw new ApiError(400, '上传的音频文件为空');
    }

    // 从文件名推断扩展名（对齐 Python ext 提取逻辑）
    const filename = file.name || 'audio.mp3';
    const ext =
      filename.includes('.') && filename.lastIndexOf('.') < filename.length - 1
        ? filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
        : 'mp3';

    // 调用转写服务（占位实现返回固定文案）
    let text: string;
    try {
      text = await transcribeFile(audioData, ext);
    } catch (err) {
      console.error('[POST /voice/transcribe] ASR error:', err);
      throw new ApiError(500, '语音转写服务暂时不可用');
    }

    return NextResponse.json({ text }, { status: 200 });
  } catch (err) {
    return toApiResponse(err);
  }
}
