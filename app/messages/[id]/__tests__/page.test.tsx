import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mock 依赖 ----------

const mockFetchMessages = vi.fn();
const mockSendTextMessage = vi.fn().mockResolvedValue({});
const mockSendVoiceMessage = vi.fn().mockResolvedValue({});
const mockMarkAsRead = vi.fn().mockResolvedValue(undefined);
let mockMessages: any[] = [];
let mockLoading = false;

vi.mock('@/stores/messageStore', () => ({
  useMessageStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      messages: mockMessages,
      loading: mockLoading,
      error: null,
      fetchMessages: mockFetchMessages,
      sendTextMessage: mockSendTextMessage,
      sendVoiceMessage: mockSendVoiceMessage,
      markAsRead: mockMarkAsRead,
    };
    return selector ? selector(state) : state;
  },
}));

const mockUser = { id: 'user-1', role: 'elder', name: '李奶奶' };
vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = { user: mockUser, isElder: true };
    return selector ? selector(state) : state;
  },
}));

const mockSpeak = vi.fn();
vi.mock('@/hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    isSpeaking: false,
    speak: mockSpeak,
    stop: vi.fn(),
    error: null,
    currentLevel: 'web',
    setSpeed: vi.fn(),
  }),
}));

// Mock useVoiceRecognition（VoiceRecorder 依赖）
vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    isListening: false,
    transcript: '',
    error: null,
    currentLevel: 'web',
    startListening: vi.fn(),
    stopListening: vi.fn(),
    resetTranscript: vi.fn(),
  }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'contact-1' }),
}));

import { render, screen, fireEvent } from '@testing-library/react';

const { default: ChatDetailPage } = await import('../ChatDetail');

// ---------- 测试 ----------

describe('ChatDetailPage 聊天详情页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [];
    mockLoading = false;
  });

  it('渲染页面标题', () => {
    render(<ChatDetailPage />);
    expect(screen.getByText('对话')).toBeDefined();
  });

  it('加载时调用 fetchMessages', () => {
    render(<ChatDetailPage />);
    expect(mockFetchMessages).toHaveBeenCalledWith('contact-1');
  });

  it('加载状态显示加载文本', () => {
    mockLoading = true;
    render(<ChatDetailPage />);
    expect(screen.getByText('加载中...')).toBeDefined();
  });

  it('渲染消息列表', () => {
    mockMessages = [
      {
        id: 'msg-1',
        sender_id: 'user-1',
        receiver_id: 'contact-1',
        type: 'text',
        content: '你好',
        audio_url: null,
        audio_duration: null,
        is_ai_generated: null,
        is_read: true,
        read_at: null,
        created_at: '2024-06-15T10:00:00Z',
      },
      {
        id: 'msg-2',
        sender_id: 'contact-1',
        receiver_id: 'user-1',
        type: 'text',
        content: '妈妈好',
        audio_url: null,
        audio_duration: null,
        is_ai_generated: null,
        is_read: false,
        read_at: null,
        created_at: '2024-06-15T10:01:00Z',
      },
    ];

    render(<ChatDetailPage />);
    expect(screen.getByText('你好')).toBeDefined();
    expect(screen.getByText('妈妈好')).toBeDefined();
  });

  it('默认为语音输入模式，显示 VoiceRecorder', () => {
    render(<ChatDetailPage />);
    expect(screen.getByTestId('voice-recorder')).toBeDefined();
  });

  it('点击模式切换按钮切换到文字输入', () => {
    render(<ChatDetailPage />);
    const toggle = screen.getByTestId('mode-toggle');
    fireEvent.click(toggle);
    expect(screen.getByTestId('text-input')).toBeDefined();
  });

  it('文字模式下输入并发送消息', async () => {
    render(<ChatDetailPage />);
    // 切换到文字模式
    fireEvent.click(screen.getByTestId('mode-toggle'));

    const input = screen.getByTestId('text-input');
    fireEvent.change(input, { target: { value: '你好啊' } });
    fireEvent.click(screen.getByText('发送'));

    expect(mockSendTextMessage).toHaveBeenCalledWith('user-1', 'contact-1', '你好啊');
  });

  it('返回按钮导航到消息列表', () => {
    render(<ChatDetailPage />);
    fireEvent.click(screen.getByLabelText('返回消息列表'));
    expect(mockPush).toHaveBeenCalledWith('/messages');
  });

  it('标记未读消息为已读', () => {
    mockMessages = [
      {
        id: 'msg-unread',
        sender_id: 'contact-1',
        receiver_id: 'user-1',
        type: 'text',
        content: '未读消息',
        audio_url: null,
        audio_duration: null,
        is_ai_generated: null,
        is_read: false,
        read_at: null,
        created_at: '2024-06-15T10:00:00Z',
      },
    ];

    render(<ChatDetailPage />);
    expect(mockMarkAsRead).toHaveBeenCalledWith('msg-unread');
  });
});
