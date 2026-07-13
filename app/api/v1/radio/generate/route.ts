// ============================================================
// POST /api/v1/radio/generate
// ------------------------------------------------------------
// 对齐 backend/api/v1/radio.py · generate_broadcast
//   1. requireUser 鉴权
//   2. generateBroadcastText：调豆包 LLM 生成标题+正文（无 Key 时降级占位回复）
//   3. generateAudio：调火山 TTS（speed=0.9）+ 估算时长；audio_bytes 不落库
//   4. 写 health_broadcasts（is_published=true, generated_by='doubao'）
// 返回：201 BroadcastResponse（插入的行）
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
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

export async function POST(request: NextRequest) {
  try {
    // 鉴权（Python 仅用于依赖校验，未将 user_id 落库到 health_broadcasts）
    await requireUser(request);

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

    // 2. 使用 TTS 生成音频（仅取估算时长，audio_bytes 不落库）
    const { duration } = await generateAudio(textResult.content);

    // 3. 保存广播记录到数据库
    const now = new Date().toISOString();
    const record: BroadcastInsert = {
      title: textResult.title,
      content: textResult.content,
      category: body.category,
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

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('oc_health_broadcasts')
      .insert(record)
      .select();

    if (error) {
      console.error('[POST /radio/generate] 保存广播失败:', error);
      throw new ApiError(500, '保存广播内容失败');
    }

    const rows = (data ?? []) as BroadcastRow[];
    if (rows.length === 0) {
      throw new ApiError(500, '保存广播内容失败');
    }

    return NextResponse.json<BroadcastResponse>(
      toBroadcastResponse(rows[0]),
      { status: 201 },
    );
  } catch (err) {
    return toApiResponse(err);
  }
}
