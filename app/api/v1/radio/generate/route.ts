// ============================================================
// POST /api/v1/radio/generate
// ------------------------------------------------------------
// 对齐 backend/api/v1/radio.py · generate_broadcast
//   1. requireUser 鉴权
//   2. generateBroadcastText：调豆包 LLM 生成标题+正文（无 Key 时降级占位回复）
//   3. generateAudio：调 MiMo TTS 生成真实 MP3 + 估算时长
//   4. MP3 上传到私有 Supabase Storage，数据库只保存稳定对象路径
//   5. 写 health_broadcasts（is_published=true, generated_by='doubao'）
//      数据库失败时补偿删除已上传对象
// 返回：201 BroadcastResponse（插入的行）
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  buildVoiceObjectPath,
  createSignedVoiceUrl,
  getSupabaseServerClient,
  removeVoiceObject,
  requireUser,
  toApiResponse,
  uploadVoiceObject,
} from '@/lib/server';
import { generateAudio, generateBroadcastText } from '@/lib/server/broadcast';
import { toBroadcastResponse } from '../_lib';
import type {
  BroadcastInsert,
  BroadcastResponse,
  BroadcastRow,
  GenerateRequest,
} from '../_lib';

export const runtime = 'nodejs';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Authorization',
};

function withPrivateHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

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
    // 鉴权（Python 仅用于依赖校验，未将 user_id 落库到 health_broadcasts）
    const { user_id: currentUserId } = await requireUser(request);

    const body = (await request
      .json()
      .catch(() => null)) as GenerateRequest | null;
    if (
      !body ||
      typeof body.category !== 'string' ||
      body.category.trim() === ''
    ) {
      throw new ApiError(400, 'category 不能为空');
    }

    // 1. 使用 LLM 生成广播文本
    const textResult = await generateBroadcastText({
      category: body.category,
      topic: body.topic ?? null,
      target_diseases: body.target_diseases ?? null,
    });

    // 2. 使用 MiMo TTS 生成真实 MP3
    const { bytes, contentType, duration } = await generateAudio(
      textResult.content,
    );

    // 3. 先上传私有对象。上传失败时绝不写入已发布数据库记录。
    const supabase = getSupabaseServerClient();
    const objectPath = buildVoiceObjectPath(currentUserId, 'broadcasts');
    await uploadVoiceObject(
      supabase,
      objectPath,
      bytes,
      contentType,
    );

    // 4. 保存广播记录到数据库；audio_url 只存稳定对象路径。
    const now = new Date().toISOString();
    const record: BroadcastInsert = {
      title: textResult.title,
      content: textResult.content,
      category: body.category,
      audio_url: objectPath,
      audio_duration: duration,
      is_published: true,
      target_age_min: body.target_age_min ?? null,
      target_age_max: body.target_age_max ?? null,
      target_diseases: body.target_diseases ?? null,
      ai_prompt: textResult.ai_prompt,
      generated_by: 'doubao',
      play_count: 0,
      created_at: now,
      updated_at: now,
    };

    let result: { data: unknown; error: unknown };
    try {
      result = await supabase
        .from('oc_health_broadcasts')
        .insert(record)
        .select();
    } catch {
      await bestEffortRemove(supabase, objectPath);
      throw new ApiError(500, '保存广播内容失败');
    }

    const rows = (result.data ?? []) as BroadcastRow[];
    if (result.error || rows.length === 0) {
      await bestEffortRemove(supabase, objectPath);
      console.error('[POST /radio/generate] 保存广播失败');
      throw new ApiError(500, '保存广播内容失败');
    }

    const response = toBroadcastResponse(rows[0]);
    try {
      response.audio_url = await createSignedVoiceUrl(
        supabase,
        objectPath,
        'broadcasts',
      );
    } catch {
      // 广播已经成功发布；签名可由 recommend 重试，响应不得泄露对象路径。
      response.audio_url = null;
    }

    return NextResponse.json<BroadcastResponse>(response, {
      status: 201,
      headers: PRIVATE_HEADERS,
    });
  } catch (err) {
    return withPrivateHeaders(toApiResponse(err));
  }
}
