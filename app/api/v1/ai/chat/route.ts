// ============================================================
// POST /api/v1/ai/chat
// ------------------------------------------------------------
// 对齐 backend/api/v1/ai_chat.py · ai_chat
//   1. requireUser 鉴权
//   2. session_id 缺省生成 uuid
//   3. 取最后一条 user 消息内容
//   4. 固定调用 mimo-v2.5-pro，并在服务端执行受控健康 / 碎碎念工具
//   5. 工具结果回传模型生成最终答复，再写入 ai_conversations 审计
// 返回：{ reply, session_id, actions }
// ============================================================

import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  MimoError,
  completeMimoChat,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import {
  COMPANION_TOOLS,
  buildCompanionSystemPrompt,
  executeCompanionToolCall,
  hasExplicitFamilyShareConsent,
  selectMurmurSourceText,
  type CompanionAction,
  type CompanionConversationMessage,
} from '@/lib/server/companion-tools';
import type { MimoChatMessage } from '@/lib/server/mimo';
import type { Json } from '@/types/supabase';
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
const ALLOWED_ROLES = new Set(['user', 'assistant']);

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId, role: currentRole } = await requireUser(request);

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

    const conversationMessages: CompanionConversationMessage[] = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const companionUser = {
      id: currentUserId,
      name: currentRole === 'elder' ? '长辈' : '家属',
      role: currentRole,
    };
    const mimoMessages: MimoChatMessage[] = [
      { role: 'system', content: buildCompanionSystemPrompt(companionUser) },
      ...conversationMessages.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
    ];

    const supabase = getSupabaseServerClient();
    const firstTurn = await completeMimoChat(
      mimoMessages,
      currentRole === 'elder' ? COMPANION_TOOLS : [],
    );
    const actions: CompanionAction[] = [];
    let reply = firstTurn.content;

    if (firstTurn.toolCalls.length > 0) {
      const toolResults = [];
      for (const toolCall of firstTurn.toolCalls) {
        const result = await executeCompanionToolCall(toolCall, {
          supabase,
          user: companionUser,
          sourceText: selectMurmurSourceText(conversationMessages),
          explicitShareConsent: hasExplicitFamilyShareConsent(conversationMessages),
        });
        toolResults.push(result);
        actions.push(...result.actions);
      }

      const finalTurn = await completeMimoChat([
        ...mimoMessages,
        {
          role: 'assistant',
          content: firstTurn.content || null,
          tool_calls: firstTurn.toolCalls,
        },
        ...toolResults.map((result) => ({
          role: 'tool' as const,
          tool_call_id: result.toolCallId,
          content: result.content,
        })),
      ]);
      reply = finalTurn.content;

      if (!reply) {
        reply = toolResults.map((result) => {
          try {
            const parsed = JSON.parse(result.content) as { message?: unknown };
            return typeof parsed.message === 'string' ? parsed.message : '';
          } catch {
            return '';
          }
        }).filter(Boolean).join(' ');
      }
    }

    if (!reply) {
      throw new ApiError(502, 'AI 未返回有效回复');
    }

    // 写入 ai_conversations（一行 = 一轮），与 Python 一致：先 chat 再 insert
    if (lastUserContent) {
      const record: AiConversationInsert = {
        user_id: currentUserId,
        user_input: lastUserContent,
        ai_response: reply,
        session_id: sessionId,
        intent: 'companion',
        action_taken: actions.filter((action) => action.success).map((action) => action.type).join(',') || null,
        action_result: actions as unknown as Json,
      };
      const { error } = await supabase
        .from('oc_ai_conversations')
        .insert(record);
      if (error) {
        // 工具可能已经完成，不能因审计日志写入失败让客户端重试并造成重复健康记录。
        console.error('[POST /ai/chat] 写入对话审计失败');
      }
    }

    return withPrivateNoStore(NextResponse.json<ChatResponse>({
      reply,
      session_id: sessionId,
      actions,
    }));
  } catch (err) {
    if (err instanceof MimoError) {
      return withPrivateNoStore(
        NextResponse.json({ detail: err.message }, { status: err.status }),
      );
    }
    return withPrivateNoStore(toApiResponse(err));
  }
}
