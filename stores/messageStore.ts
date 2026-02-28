// ============================================================
// 桑梓智护 — 捂话消息状态管理 (Zustand 5)
// ============================================================

import { create } from 'zustand';
import { fetchApi } from '@/lib/api';

// ---------- 类型定义（对齐后端响应） ----------

export interface MessageResponse {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: 'voice' | 'text';
  content: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  is_ai_generated: boolean | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string;
}

/** 联系人信息（从家属绑定关系派生） */
export interface ContactInfo {
  userId: string;
  name: string;
  avatarUrl?: string;
  relationship: string;
  lastMessage?: MessageResponse;
  unreadCount: number;
}

/** 发送文字消息请求体 */
export interface SendTextMessageRequest {
  sender_id: string;
  receiver_id: string;
  type: 'text';
  content: string;
  is_ai_generated?: boolean;
}

/** 发送语音消息请求体 */
export interface SendVoiceMessageRequest {
  sender_id: string;
  receiver_id: string;
  type: 'voice';
  content?: string;
  audio_url?: string;
  audio_duration?: number;
  is_ai_generated?: boolean;
}

/** 未读计数响应 */
export interface UnreadCountResponse {
  count: number;
}

// ---------- Store ----------

interface MessageState {
  /** 联系人列表（含最新消息和未读数） */
  contacts: ContactInfo[];
  /** 当前对话的消息列表 */
  messages: MessageResponse[];
  /** 总未读消息数 */
  unreadTotal: number;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;

  /** 构建联系人列表（从家属绑定 + 获取每个联系人最新消息） */
  fetchContacts: (
    binds: Array<{
      bind: { elder_id: string; family_id: string; relation: string; status: string | null };
      user: { id: string; name: string; avatar_url: string | null };
    }>,
    currentUserId: string,
  ) => Promise<void>;
  /** 获取与某用户的消息列表 */
  fetchMessages: (userId: string, limit?: number, offset?: number) => Promise<void>;
  /** 发送文字消息 */
  sendTextMessage: (senderId: string, receiverId: string, content: string) => Promise<MessageResponse>;
  /** 发送语音消息 */
  sendVoiceMessage: (
    senderId: string,
    receiverId: string,
    data: { content?: string; audio_url?: string; audio_duration?: number; is_ai_generated?: boolean },
  ) => Promise<MessageResponse>;
  /** 标记消息已读 */
  markAsRead: (messageId: string) => Promise<void>;
  /** 获取未读消息总数 */
  fetchUnreadCount: () => Promise<void>;
  /** 清空状态 */
  reset: () => void;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  contacts: [],
  messages: [],
  unreadTotal: 0,
  loading: false,
  error: null,

  fetchContacts: async (binds, currentUserId) => {
    set({ loading: true, error: null });
    try {
      // 过滤活跃绑定
      const activeBinds = binds.filter((b) => b.bind.status === 'active');

      // 为每个联系人获取最新消息
      const contactPromises = activeBinds.map(async (bind) => {
        const contact: ContactInfo = {
          userId: bind.user.id,
          name: bind.user.name,
          avatarUrl: bind.user.avatar_url ?? undefined,
          relationship: bind.bind.relation,
          unreadCount: 0,
        };

        try {
          // 获取最新一条消息
          const msgs = await fetchApi<MessageResponse[]>(
            `/api/v1/messages/${bind.user.id}?limit=1&offset=0`,
          );
          if (msgs.length > 0) {
            contact.lastMessage = msgs[msgs.length - 1];
          }

          // 计算未读数：获取所有消息中对方发给我的未读消息
          const allMsgs = await fetchApi<MessageResponse[]>(
            `/api/v1/messages/${bind.user.id}?limit=50&offset=0`,
          );
          contact.unreadCount = allMsgs.filter(
            (m) => m.sender_id === bind.user.id && m.receiver_id === currentUserId && !m.is_read,
          ).length;
        } catch {
          // 静默失败 — 单个联系人消息获取失败不影响整体
        }

        return contact;
      });

      const contacts = await Promise.all(contactPromises);

      // 按最新消息时间排序（有消息的排前面）
      contacts.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      // 计算总未读数
      const unreadTotal = contacts.reduce((sum, c) => sum + c.unreadCount, 0);

      set({ contacts, unreadTotal, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载联系人失败',
        loading: false,
      });
    }
  },

  fetchMessages: async (userId, limit = 50, offset = 0) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchApi<MessageResponse[]>(
        `/api/v1/messages/${userId}?limit=${limit}&offset=${offset}`,
      );
      set({ messages: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载消息失败',
        loading: false,
      });
    }
  },

  sendTextMessage: async (senderId, receiverId, content) => {
    const body: SendTextMessageRequest = {
      sender_id: senderId,
      receiver_id: receiverId,
      type: 'text',
      content,
    };
    const result = await fetchApi<MessageResponse>('/api/v1/messages/send', {
      method: 'POST',
      body,
    });
    // 追加到当前消息列表
    set((state) => ({ messages: [...state.messages, result] }));
    return result;
  },

  sendVoiceMessage: async (senderId, receiverId, data) => {
    const body: SendVoiceMessageRequest = {
      sender_id: senderId,
      receiver_id: receiverId,
      type: 'voice',
      ...data,
    };
    const result = await fetchApi<MessageResponse>('/api/v1/messages/send-voice', {
      method: 'POST',
      body,
    });
    set((state) => ({ messages: [...state.messages, result] }));
    return result;
  },

  markAsRead: async (messageId) => {
    await fetchApi(`/api/v1/messages/${messageId}/read`, { method: 'PATCH' });
    // 更新本地消息状态
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m,
      ),
    }));
  },

  fetchUnreadCount: async () => {
    try {
      const data = await fetchApi<UnreadCountResponse>('/api/v1/messages/unread-count');
      set({ unreadTotal: data.count });
    } catch {
      // 静默失败 — 未读计数非关键
    }
  },

  reset: () => {
    set({
      contacts: [],
      messages: [],
      unreadTotal: 0,
      loading: false,
      error: null,
    });
  },
}));
