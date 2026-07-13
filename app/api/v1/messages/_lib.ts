// ============================================================
// 桑梓智护 · messages 域共享类型与跨用户权限校验（仅服务端）
// ------------------------------------------------------------
// 对齐 backend/api/v1/messages.py 与 backend/models/message.py。
// 鉴权增强（相对 Python 现状，plan 06 任务要求）：
//   - 获取会话 / 发送消息：当前用户与对方需存在 active 家庭绑定
//     （双向：current 为 family 绑 peer 为 elder，或反向均可）。
//   - 标记已读：仅校验 receiver_id == 当前用户（对齐 Python）。
// 表结构以 types/supabase.ts 为准（elder_care_messages）。
// ============================================================

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { throwApiError } from '@/lib/server';

export type MessageRow =
  Database['public']['Tables']['oc_elder_care_messages']['Row'];
export type MessageInsert =
  Database['public']['Tables']['oc_elder_care_messages']['Insert'];

/** 对齐 Python MessageResponse / 前端 messageStore.MessageResponse。 */
export interface MessageResponse {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: string;
  content: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  is_ai_generated: boolean | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string | null;
}

/** 将 elder_care_messages 行映射为响应体。 */
export function toMessageResponse(row: MessageRow): MessageResponse {
  return {
    id: row.id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    type: row.type,
    content: row.content,
    audio_url: row.audio_url,
    audio_duration: row.audio_duration,
    is_ai_generated: row.is_ai_generated,
    is_read: row.is_read,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

const SAFE_ID_RE = /^[A-Za-z0-9_-]+$/;

/** 校验 id 形态安全（防 PostgREST or-filter 字符串拼接注入）。 */
export function assertSafeId(id: string, field: string): void {
  if (!id) {
    throwApiError(400, `${field} 不能为空`);
  }
  if (!SAFE_ID_RE.test(id)) {
    throwApiError(400, `${field} 格式非法`);
  }
}

/**
 * 校验当前用户与对方存在 active 家庭绑定（双向）。
 * 消息域只需绑定存在，不检查 can_view_health 等权限位
 * （消息是双向通信，绑定任一方向即可）。
 * 对齐 plan 06：相对 Python 现状增加绑定校验，防止给陌生人发消息。
 */
export async function resolveMessagePeer(
  supabase: SupabaseClient<Database>,
  currentUserId: string,
  peerId: string,
): Promise<void> {
  if (peerId === currentUserId) {
    // 给自己发消息无实际意义，但对齐 Python 不拦截。
    return;
  }

  assertSafeId(peerId, 'peer_id');

  const { data, error } = await supabase
    .from('oc_elder_family_binds')
    .select('id')
    .eq('status', 'active')
    .or(
      `and(family_id.eq.${currentUserId},elder_id.eq.${peerId}),and(family_id.eq.${peerId},elder_id.eq.${currentUserId})`,
    )
    .limit(1);

  if (error) {
    console.error('[messages] 校验家庭绑定失败:', error);
    throwApiError(500, '校验家庭绑定失败');
  }

  if (!data || data.length === 0) {
    throwApiError(403, '只能与绑定的家庭成员互发消息');
  }
}
