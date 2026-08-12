// ============================================================
// 桑梓智护 — 捂话消息状态管理 (Zustand 5)
// ============================================================

import { create } from 'zustand';
import { fetchApi, fetchFormData } from '@/lib/api';
import { contactDisplayName, sortContacts } from '@/lib/contactPreferences';

// ---------- 类型定义（对齐后端响应） ----------

export type MessageCategory = 'chat' | 'murmur' | 'system';

export interface MessageResponse {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: 'voice' | 'text';
  content: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  category: MessageCategory;
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
  isPinned?: boolean;
}

/** 发送文字消息请求体 */
export interface SendTextMessageRequest {
  sender_id: string;
  receiver_id: string;
  type: 'text';
  content: string;
  is_ai_generated?: boolean;
}

/** 待上传的真实语音草稿。durationMs 来自 PCM 录音器，不使用 UI 计时器。 */
export interface SendVoiceMessageData {
  content: string;
  audioBlob: Blob;
  durationMs: number;
  signal?: AbortSignal;
}

/** 未读计数响应 */
export interface UnreadCountResponse {
  count: number;
}

export interface ConversationOverviewResponse {
  peer_id: string;
  last_message: MessageResponse | null;
  unread_count: number;
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
  contactsOwnerUserId: string | null;
  contactsRequestId: number;

  /** 构建联系人列表（从家属绑定 + 获取每个联系人最新消息） */
  fetchContacts: (
    binds: Array<{
      bind: {
        elder_id: string;
        family_id: string;
        relation: string;
        status?: string | null;
        contact_preference?: { alias: string | null; is_pinned: boolean };
      };
      user: { id: string; name: string; avatar_url?: string | null };
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
    data: SendVoiceMessageData,
  ) => Promise<MessageResponse>;
  /** 标记消息已读 */
  markAsRead: (messageId: string) => Promise<void>;
  /** 一次标记与某联系人的全部未读消息 */
  markConversationAsRead: (userId: string) => Promise<void>;
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
  contactsOwnerUserId: null,
  contactsRequestId: 0,

  fetchContacts: async (binds, currentUserId) => {
    const requestId = get().contactsRequestId + 1;
    set({
      contactsOwnerUserId: currentUserId,
      contactsRequestId: requestId,
      loading: true,
      error: null,
    });
    try {
      // 后端与前端都只接受明确活跃的绑定，未知或待确认状态不能暴露联系人。
      const activeBinds = binds.filter((b) => b.bind.status === 'active');

      if (!currentUserId || activeBinds.length === 0) {
        set({ contacts: [], unreadTotal: 0, loading: false });
        return;
      }

      // 服务端一次聚合全部联系人的最新消息与未读数，避免联系人数量放大 HTTP 请求。
      const overview = await fetchApi<ConversationOverviewResponse[]>(
        '/api/v1/messages/overview',
      );
      const overviewByPeer = new Map(
        overview.map((item) => [item.peer_id, item]),
      );

      const contacts = activeBinds.map((bind) => {
        const summary = overviewByPeer.get(bind.user.id);
        return {
          userId: bind.user.id,
          name: contactDisplayName(
            bind.bind.contact_preference?.alias,
            bind.user.name,
            '家人',
          ),
          avatarUrl: bind.user.avatar_url ?? undefined,
          relationship:
            bind.bind.elder_id === currentUserId ? '家属' : bind.bind.relation,
          lastMessage: summary?.last_message ?? undefined,
          unreadCount: summary?.unread_count ?? 0,
          isPinned: bind.bind.contact_preference?.is_pinned ?? false,
        };
      });

      contacts.sort(sortContacts);

      // 计算总未读数
      const unreadTotal = contacts.reduce((sum, c) => sum + c.unreadCount, 0);

      if (
        get().contactsRequestId !== requestId
        || get().contactsOwnerUserId !== currentUserId
      ) return;
      set({ contacts, unreadTotal, loading: false });
    } catch (err) {
      if (
        get().contactsRequestId !== requestId
        || get().contactsOwnerUserId !== currentUserId
      ) return;
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

  sendVoiceMessage: async (_senderId, receiverId, data) => {
    const content = data.content.trim();
    if (!content) throw new Error('语音转写不能为空');
    if (data.audioBlob.type !== 'audio/wav' || data.audioBlob.size === 0) {
      throw new Error('录音文件无效，请重新录制');
    }
    if (!Number.isFinite(data.durationMs) || data.durationMs <= 0 || data.durationMs > 60_000) {
      throw new Error('录音时长无效，请重新录制');
    }

    const formData = new FormData();
    formData.set('receiver_id', receiverId);
    formData.set('content', content);
    formData.set('duration_ms', String(Math.round(data.durationMs)));
    formData.set('file', new File(
      [data.audioBlob],
      'recording.wav',
      { type: 'audio/wav' },
    ));

    const result = await fetchFormData<MessageResponse>(
      '/api/v1/messages/send-voice',
      formData,
      { signal: data.signal },
    );
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

  markConversationAsRead: async (userId) => {
    const result = await fetchApi<{ count: number }>('/api/v1/messages/read-all', {
      method: 'PATCH',
      body: { peer_id: userId },
    });
    if (result.count <= 0) return;

    const readAt = new Date().toISOString();
    set((state) => {
      const contacts = state.contacts.map((contact) =>
        contact.userId === userId ? { ...contact, unreadCount: 0 } : contact);
      return {
        messages: state.messages.map((message) =>
          message.sender_id === userId && !message.is_read
            ? { ...message, is_read: true, read_at: readAt }
            : message),
        contacts,
        unreadTotal: contacts.reduce((sum, contact) => sum + contact.unreadCount, 0),
      };
    });
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
      contactsOwnerUserId: null,
      contactsRequestId: get().contactsRequestId + 1,
    });
  },
}));
