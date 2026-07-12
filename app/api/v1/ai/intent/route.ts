// ============================================================
// POST /api/v1/ai/intent
// ------------------------------------------------------------
// 对齐 backend/api/v1/ai_chat.py · ai_intent
//   1. requireUser 鉴权
//   2. 调用豆包意图识别（无 Key 时服务端降级）
//   3. 返回 { intent, entities, confidence }
// 前端契约：useAIChat.recognizeIntent → IntentResult
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, requireUser, toApiResponse } from '@/lib/server';
import { recognizeIntent } from '@/lib/server/doubao';
import type { IntentRequest, IntentResponse } from '../_lib';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body = (await request
      .json()
      .catch(() => null)) as IntentRequest | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }
    if (typeof body.text !== 'string') {
      throw new ApiError(400, 'text 必须为字符串');
    }

    const result = await recognizeIntent(body.text);

    console.info(
      '[POST /ai/intent] user=%s intent=%s confidence=%s',
      currentUserId,
      result.intent,
      result.confidence,
    );

    return NextResponse.json<IntentResponse>({
      intent: result.intent,
      entities: result.entities,
      confidence: result.confidence,
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
