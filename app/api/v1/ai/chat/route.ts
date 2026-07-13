// ============================================================
// POST /api/v1/ai/chat
// ------------------------------------------------------------
// 对齐 backend/api/v1/ai_chat.py · ai_chat
//   1. requireUser 鉴权
//   2. session_id 缺省生成 uuid
//   3. 取最后一条 user 消息内容
//   4. 调用豆包 LLM（无 Key 时服务端降级占位回复，不 500）
//   5. 写入 ai_conversations 表（user_id / user_input / ai_response / session_id）
// 返回：{ reply, session_id }
// ============================================================

import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { chat, type LlmMessage } from '@/lib/server/doubao';
import { readBoundedJson, withPrivateNoStore } from '../../_http';
import type {
  AiConversationInsert,
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from '../_lib';

export const runtime = 'nodejs';

const MAX_JSON_BYTES = 64 * 1024;
const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARACTERS = 4_000;
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body = await readBoundedJson<ChatRequest | null>(
      request,
      MAX_JSON_BYTES,
    );
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    // messages 校验
    if (!Array.isArray(body.messages)) {
      throw new ApiError(400, 'messages 必须为数组');
    }
    const messages = body.messages as ChatMessage[];
    if (messages.length === 0) {
      throw new ApiError(400, 'messages 不能为空');
    }
    if (messages.length > MAX_MESSAGES) {
      throw new ApiError(400, 'messages 不能超过 50 条');
    }
    for (const m of messages) {
      if (
        typeof m !== 'object' ||
        m === null ||
        Array.isArray(m) ||
        typeof m.role !== 'string' ||
        !ALLOWED_ROLES.has(m.role) ||
        typeof m.content !== 'string'
      ) {
        throw new ApiError(400, 'messages 每项需含 role 与 content 字符串');
      }
      if (Array.from(m.content).length > MAX_MESSAGE_CHARACTERS) {
        throw new ApiError(400, '单条消息不能超过 4000 个字符');
      }
    }

    const sessionId =
      typeof body.session_id === 'string' && body.session_id.trim() !== ''
        ? body.session_id
        : randomUUID();

    // 取最后一条 user 消息用于落库（对齐 Python last_user_content 逻辑）
    let lastUserContent = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserContent = messages[i].content;
        break;
      }
    }

    // 调用豆包 LLM（服务端；无 Key 时内部降级占位回复）
    const llmMessages: LlmMessage[] = messages.map((m) => ({
      role: m.role as LlmMessage['role'],
      content: m.content,
    }));
    const reply = await chat(llmMessages);

    // 写入 ai_conversations（一行 = 一轮），与 Python 一致：先 chat 再 insert
    if (lastUserContent) {
      const supabase = getSupabaseServerClient();
      const record: AiConversationInsert = {
        user_id: currentUserId,
        user_input: lastUserContent,
        ai_response: reply,
        session_id: sessionId,
      };
      const { error } = await supabase
        .from('oc_ai_conversations')
        .insert(record);
      if (error) {
        console.error('[POST /ai/chat] 写入对话记录失败:', error);
        throw new ApiError(500, '保存对话记录失败');
      }
    }

    return withPrivateNoStore(NextResponse.json<ChatResponse>({
      reply,
      session_id: sessionId,
    }));
  } catch (err) {
    return withPrivateNoStore(toApiResponse(err));
  }
}
