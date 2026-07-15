import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encodePcm16Wav } from '@/lib/audio/wav';
import { useMessageStore } from '../messageStore';
import type { MessageResponse } from '../messageStore';

// Mock fetchApi
vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn(),
  fetchFormData: vi.fn(),
}));

import { fetchApi, fetchFormData } from '@/lib/api';

const mockFetchApi = fetchApi as ReturnType<typeof vi.fn>;
const mockFetchFormData = fetchFormData as ReturnType<typeof vi.fn>;

function makeWavBlob(durationMs: number): Blob {
  const bytes = encodePcm16Wav(
    new Float32Array(Math.round(16_000 * durationMs / 1_000)),
    16_000,
    1,
  );
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: 'audio/wav' });
}

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
    category: 'chat',
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
    mockFetchApi.mockReset();
    mockFetchFormData.mockReset();
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

  describe('markConversationAsRead', () => {
    it('一次请求更新会话消息、联系人和总未读数', async () => {
      useMessageStore.setState({
        messages: [
          makeMessage({ id: 'm-1', sender_id: 'user-b', is_read: false }),
          makeMessage({ id: 'm-2', sender_id: 'user-c', is_read: false }),
        ],
        contacts: [
          { userId: 'user-b', name: '小红', relationship: '母亲', unreadCount: 2 },
          { userId: 'user-c', name: '小明', relationship: '父亲', unreadCount: 1 },
        ],
        unreadTotal: 3,
      });
      mockFetchApi.mockResolvedValue({ count: 2 });

      await useMessageStore.getState().markConversationAsRead('user-b');

      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/messages/read-all', {
        method: 'PATCH',
        body: { peer_id: 'user-b' },
      });
      const state = useMessageStore.getState();
      expect(state.messages[0].is_read).toBe(true);
      expect(state.messages[1].is_read).toBe(false);
      expect(state.contacts.map((contact) => contact.unreadCount)).toEqual([0, 1]);
      expect(state.unreadTotal).toBe(1);
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
    it('用 multipart 上传真实 WAV 并在成功后追加消息', async () => {
      const voiceMsg = makeMessage({
        id: 'voice-1',
        type: 'voice',
        audio_url: '/api/v1/voice/audio?message_id=voice-1',
        audio_duration: 2.45,
      });
      mockFetchFormData.mockResolvedValue(voiceMsg);
      const audioBlob = makeWavBlob(2_450);
      const controller = new AbortController();

      const result = await useMessageStore.getState().sendVoiceMessage(
        'user-a',
        'user-b',
        {
          content: '今天记得吃药',
          audioBlob,
          durationMs: 2_450,
          signal: controller.signal,
        },
      );

      expect(result.type).toBe('voice');
      expect(result.audio_url).toContain('message_id=voice-1');
      expect(useMessageStore.getState().messages).toEqual([voiceMsg]);
      expect(mockFetchFormData).toHaveBeenCalledOnce();
      const [path, formData, options] = mockFetchFormData.mock.calls[0];
      expect(path).toBe('/api/v1/messages/send-voice');
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('receiver_id')).toBe('user-b');
      expect(formData.get('content')).toBe('今天记得吃药');
      expect(formData.get('duration_ms')).toBe('2450');
      expect(formData.get('file')).toMatchObject({ type: 'audio/wav', name: 'recording.wav' });
      expect(options).toEqual({ signal: controller.signal });
      expect(mockFetchApi).not.toHaveBeenCalledWith('/api/v1/messages/send-voice', expect.anything());
    });

    it('上传失败时不追加假语音消息', async () => {
      mockFetchFormData.mockRejectedValue(new Error('语音上传失败'));

      await expect(useMessageStore.getState().sendVoiceMessage(
        'user-a',
        'user-b',
        {
          content: '不要追加',
          audioBlob: makeWavBlob(1_000),
          durationMs: 1_000,
        },
      )).rejects.toThrow('语音上传失败');

      expect(useMessageStore.getState().messages).toEqual([]);
    });
  });

  describe('fetchContacts', () => {
    it('成功构建联系人列表', async () => {
      const bind = makeBind();
      const latestMsg = makeMessage({ sender_id: 'user-contact', receiver_id: 'me' });

      mockFetchApi.mockResolvedValueOnce([latestMsg]);

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

      mockFetchApi.mockResolvedValueOnce([]);

      await useMessageStore.getState().fetchContacts([activeBind, inactiveBind], 'me');

      const state = useMessageStore.getState();
      expect(state.contacts).toHaveLength(1);
      expect(state.contacts[0].name).toBe('小红');
    });

    it('只接受明确 active，pending、null 与缺失状态都不能成为联系人', async () => {
      const activeBind = makeBind();
      const pendingBind = makeBind({
        bind: { status: 'pending' },
        user: { id: 'user-pending', name: '待确认' },
      });
      const nullBind = makeBind({
        bind: { status: null },
        user: { id: 'user-null', name: '状态未知' },
      });
      const missingBind = makeBind({ user: { id: 'user-missing', name: '缺少状态' } });
      delete missingBind.bind.status;

      mockFetchApi.mockResolvedValueOnce([]);

      await useMessageStore.getState().fetchContacts(
        [activeBind, pendingBind, nullBind, missingBind],
        'me',
      );

      expect(useMessageStore.getState().contacts.map((contact) => contact.name))
        .toEqual(['小红']);
      expect(mockFetchApi).toHaveBeenCalledOnce();
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
