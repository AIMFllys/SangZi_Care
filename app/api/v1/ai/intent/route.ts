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
import { readBoundedJson, withPrivateNoStore } from '../../_http';

export const runtime = 'nodejs';

const MAX_JSON_BYTES = 8 * 1024;
const MAX_TEXT_CHARACTERS = 2_000;

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body = await readBoundedJson<IntentRequest | null>(
      request,
      MAX_JSON_BYTES,
    );
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }
    if (typeof body.text !== 'string') {
      throw new ApiError(400, 'text 必须为字符串');
    }
    const text = body.text.trim();
    if (text === '' || Array.from(text).length > MAX_TEXT_CHARACTERS) {
      throw new ApiError(400, 'text 不能为空且不能超过 2000 个字符');
    }

    const result = await recognizeIntent(text);

    console.info(
      '[POST /ai/intent] user=%s intent=%s confidence=%s',
      currentUserId,
      result.intent,
      result.confidence,
    );

    return withPrivateNoStore(NextResponse.json<IntentResponse>({
      intent: result.intent,
      entities: result.entities,
      confidence: result.confidence,
    }));
  } catch (err) {
    return withPrivateNoStore(toApiResponse(err));
  }
}
