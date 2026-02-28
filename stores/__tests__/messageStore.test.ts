import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMessageStore } from '../messageStore';
import type { MessageResponse } from '../messageStore';

// Mock fetchApi
vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from '@/lib/api';

const mockFetchApi = fetchApi as ReturnType<typeof vi.fn>;

// ---------- 辅助工厂 ----------

function makeMessage(overrides: Partial<MessageResponse> = {}): MessageResponse {
  return {
    id: 'msg-1',
    sender_id: 'user-a',
    receiver_id: 'user-b',
    type: 'text',
    content: '你好',
    audio_url: null,
    audio_duration: null,
    is_ai_generated: null,
    is_read: false,
    read_at: null,
    created_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

function makeBind(overrides: Record<string, any> = {}) {
  return {
    bind: {
      elder_id: 'elder-1',
      family_id: 'family-1',
      relation: '女儿',
      status: 'active' as string | null,
      ...overrides.bind,
    },
    user: {
      id: 'user-contact',
      name: '小红',
      avatar_url: null,
      ...overrides.user,
    },
  };
}

// ---------- Store 测试 ----------

describe('useMessageStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMessageStore.getState().reset();
  });

  describe('初始状态', () => {
    it('默认值正确', () => {
      const state = useMessageStore.getState();
      expect(state.contacts).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.unreadTotal).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchUnreadCount', () => {
    it('成功获取未读消息数', async () => {
      mockFetchApi.mockResolvedValue({ count: 5 });

      await useMessageStore.getState().fetchUnreadCount();

      expect(useMessageStore.getState().unreadTotal).toBe(5);
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/messages/unread-count');
    });

    it('获取失败时静默处理', async () => {
      mockFetchApi.mockRejectedValue(new Error('网络错误'));

      await useMessageStore.getState().fetchUnreadCount();

      // 不应抛出错误，unreadTotal 保持默认值
      expect(useMessageStore.getState().unreadTotal).toBe(0);
    });

    it('未读数为0时正确设置', async () => {
      mockFetchApi.mockResolvedValue({ count: 0 });

      await useMessageStore.getState().fetchUnreadCount();

      expect(useMessageStore.getState().unreadTotal).toBe(0);
    });
  });

  describe('sendTextMessage', () => {
    it('成功发送文字消息并追加到列表', async () => {
      const sentMsg = makeMessage({ id: 'new-msg', content: '你好呀' });
      mockFetchApi.mockResolvedValue(sentMsg);

      const result = await useMessageStore.getState().sendTextMessage(
        'user-a',
        'user-b',
        '你好呀',
      );

      expect(result).toEqual(sentMsg);
      expect(useMessageStore.getState().messages).toHaveLength(1);
      expect(useMessageStore.getState().messages[0].id).toBe('new-msg');
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/messages/send', {
        method: 'POST',
        body: {
          sender_id: 'user-a',
          receiver_id: 'user-b',
          type: 'text',
          content: '你好呀',
        },
      });
    });

    it('发送失败时抛出错误', async () => {
      mockFetchApi.mockRejectedValue(new Error('发送失败'));

      await expect(
        useMessageStore.getState().sendTextMessage('user-a', 'user-b', '你好'),
      ).rejects.toThrow('发送失败');
    });

    it('追加到已有消息列表末尾', async () => {
      const existing = makeMessage({ id: 'existing' });
      useMessageStore.setState({ messages: [existing] });

      const newMsg = makeMessage({ id: 'new-msg' });
      mockFetchApi.mockResolvedValue(newMsg);

      await useMessageStore.getState().sendTextMessage('user-a', 'user-b', '新消息');

      expect(useMessageStore.getState().messages).toHaveLength(2);
      expect(useMessageStore.getState().messages[1].id).toBe('new-msg');
    });
  });

  describe('markAsRead', () => {
    it('成功标记消息已读并更新本地状态', async () => {
      const msg = makeMessage({ id: 'msg-1', is_read: false, read_at: null });
      useMessageStore.setState({ messages: [msg] });
      mockFetchApi.mockResolvedValue(undefined);

      await useMessageStore.getState().markAsRead('msg-1');

      const updated = useMessageStore.getState().messages[0];
      expect(updated.is_read).toBe(true);
      expect(updated.read_at).toBeTruthy();
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/messages/msg-1/read', {
        method: 'PATCH',
      });
    });

    it('只更新目标消息，不影响其他消息', async () => {
      const msg1 = makeMessage({ id: 'msg-1', is_read: false });
      const msg2 = makeMessage({ id: 'msg-2', is_read: false });
      useMessageStore.setState({ messages: [msg1, msg2] });
      mockFetchApi.mockResolvedValue(undefined);

      await useMessageStore.getState().markAsRead('msg-1');

      const state = useMessageStore.getState();
      expect(state.messages[0].is_read).toBe(true);
      expect(state.messages[1].is_read).toBe(false);
    });

    it('标记失败时抛出错误', async () => {
      mockFetchApi.mockRejectedValue(new Error('标记失败'));

      await expect(
        useMessageStore.getState().markAsRead('msg-1'),
      ).rejects.toThrow('标记失败');
    });
  });

  describe('fetchMessages', () => {
    it('成功获取消息列表', async () => {
      const msgs = [makeMessage({ id: 'msg-1' }), makeMessage({ id: 'msg-2' })];
      mockFetchApi.mockResolvedValue(msgs);

      await useMessageStore.getState().fetchMessages('user-b');

      const state = useMessageStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.loading).toBe(false);
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/api/v1/messages/user-b?limit=50&offset=0',
      );
    });

    it('获取失败设置错误信息', async () => {
      mockFetchApi.mockRejectedValue(new Error('加载失败'));

      await useMessageStore.getState().fetchMessages('user-b');

      const state = useMessageStore.getState();
      expect(state.error).toBe('加载失败');
      expect(state.loading).toBe(false);
    });
  });

  describe('sendVoiceMessage', () => {
    it('成功发送语音消息', async () => {
      const voiceMsg = makeMessage({
        id: 'voice-1',
        type: 'voice',
        audio_url: 'https://example.com/audio.mp3',
        audio_duration: 5.2,
      });
      mockFetchApi.mockResolvedValue(voiceMsg);

      const result = await useMessageStore.getState().sendVoiceMessage(
        'user-a',
        'user-b',
        { audio_url: 'https://example.com/audio.mp3', audio_duration: 5.2 },
      );

      expect(result.type).toBe('voice');
      expect(result.audio_url).toBe('https://example.com/audio.mp3');
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/messages/send-voice', {
        method: 'POST',
        body: expect.objectContaining({
          sender_id: 'user-a',
          receiver_id: 'user-b',
          type: 'voice',
        }),
      });
    });
  });

  describe('fetchContacts', () => {
    it('成功构建联系人列表', async () => {
      const bind = makeBind();
      const latestMsg = makeMessage({ sender_id: 'user-contact', receiver_id: 'me' });

      // 第一次调用获取最新消息，第二次获取所有消息计算未读
      mockFetchApi
        .mockResolvedValueOnce([latestMsg])  // limit=1
        .mockResolvedValueOnce([latestMsg]); // limit=50

      await useMessageStore.getState().fetchContacts([bind], 'me');

      const state = useMessageStore.getState();
      expect(state.contacts).toHaveLength(1);
      expect(state.contacts[0].name).toBe('小红');
      expect(state.contacts[0].relationship).toBe('女儿');
      expect(state.loading).toBe(false);
    });

    it('过滤非活跃绑定', async () => {
      const activeBind = makeBind();
      const inactiveBind = makeBind({
        bind: { status: 'inactive' },
        user: { id: 'user-inactive', name: '小明' },
      });

      mockFetchApi
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await useMessageStore.getState().fetchContacts([activeBind, inactiveBind], 'me');

      const state = useMessageStore.getState();
      expect(state.contacts).toHaveLength(1);
      expect(state.contacts[0].name).toBe('小红');
    });
  });

  describe('reset', () => {
    it('重置所有状态', () => {
      useMessageStore.setState({
        contacts: [{ userId: 'u1', name: '测试', relationship: '儿子', unreadCount: 1 }],
        messages: [makeMessage()],
        unreadTotal: 3,
        error: '错误',
      });

      useMessageStore.getState().reset();

      const state = useMessageStore.getState();
      expect(state.contacts).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.unreadTotal).toBe(0);
      expect(state.error).toBeNull();
    });
  });
});
