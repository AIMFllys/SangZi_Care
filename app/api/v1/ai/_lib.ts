// ============================================================
// 桑梓智护 · ai 域共享类型与映射（仅服务端，非路由文件）
// ------------------------------------------------------------
// 对齐 backend/api/v1/ai_chat.py（路由内 Pydantic 模型）与
// types/supabase.ts 的 ai_conversations 表。
// 前端契约：hooks/useAIChat.ts、stores/summaryStore.ts。
// ============================================================

import type { Database } from '@/types/supabase';
import type { AIChatResponse } from '@/types/ai';

export type AiConversationRow =
  Database['public']['Tables']['oc_ai_conversations']['Row'];
export type AiConversationInsert =
  Database['public']['Tables']['oc_ai_conversations']['Insert'];

/** 单条对话消息。对齐 Python ChatMessage。 */
export interface ChatMessage {
  role: string;
  content: string;
}

/** POST /ai/chat 请求体。 */
export interface ChatRequest {
  messages: ChatMessage[];
  session_id?: string | null;
}

/** POST /ai/chat 响应体（前端 fetchApi<{ reply, session_id }>）。 */
export type ChatResponse = AIChatResponse;

/** POST /ai/intent 请求体。 */
export interface IntentRequest {
  text: string;
}

/** POST /ai/intent 响应体（前端 IntentResult）。 */
export interface IntentResponse {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
}

/** GET /ai/summary/{user_id} 响应体（前端 { summary, message_count }）。 */
export interface SummaryResponse {
  summary: string;
  message_count: number;
}

/** summary 端点查询 ai_conversations 行所需的最小字段集。 */
export interface AiConversationSummaryRow {
  user_input: string | null;
  ai_response: string | null;
}
