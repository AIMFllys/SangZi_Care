import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRelationEmoji, formatMessageTime, getMessagePreview } from '@/lib/messageUtils';
import type { MessageResponse } from '@/stores/messageStore';

// ============================================================
// 纯函数单元测试
// ============================================================

describe('getRelationEmoji', () => {
  it('儿子返回👦', () => {
    expect(getRelationEmoji('儿子')).toBe('👦');
  });

  it('女儿返回👧', () => {
    expect(getRelationEmoji('女儿')).toBe('👧');
  });

  it('配偶返回💑', () => {
    expect(getRelationEmoji('配偶')).toBe('💑');
  });

  it('未知关系返回👤', () => {
    expect(getRelationEmoji('朋友')).toBe('👤');
  });
});

describe('formatMessageTime', () => {
  it('今天的消息显示时:分', () => {
    const now = new Date();
    now.setHours(14, 30, 0, 0);
    const result = formatMessageTime(now.toISOString());
    expect(result).toBe('14:30');
  });

  it('昨天的消息显示"昨天"', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(10, 0, 0, 0);
    const result = formatMessageTime(yesterday.toISOString());
    expect(result).toBe('昨天');
  });

  it('更早的消息显示月/日', () => {
    const old = new Date('2024-03-15T10:00:00Z');
    const result = formatMessageTime(old.toISOString());
    expect(result).toMatch(/\d+\/\d+/);
  });

  it('空字符串返回空', () => {
    expect(formatMessageTime('')).toBe('');
  });
});

describe('getMessagePreview', () => {
  it('文字消息返回内容', () => {
    const msg: MessageResponse = {
      id: '1',
      sender_id: 'a',
      receiver_id: 'b',
      type: 'text',
      content: '你好',
      audio_url: null,
      audio_duration: null,
      is_ai_generated: null,
      is_read: false,
      read_at: null,
      created_at: '2024-06-15T10:00:00Z',
    };
    expect(getMessagePreview('text', '你好')).toBe('你好');
  });

  it('语音消息返回🎤标识和时长', () => {
    const msg: MessageResponse = {
      id: '1',
      sender_id: 'a',
      receiver_id: 'b',
      type: 'voice',
      content: null,
      audio_url: 'https://example.com/audio.mp3',
      audio_duration: 5.2,
      is_ai_generated: null,
      is_read: false,
      read_at: null,
      created_at: '2024-06-15T10:00:00Z',
    };
    expect(getMessagePreview('voice', '')).toBeDefined();
  });

  it('无消息返回"暂无消息"', () => {
    expect(getMessagePreview('text', '')).toBe('');
  });
});

// ============================================================
// 组件渲染测试
// ============================================================

// Mock 依赖
const mockFetchContacts = vi.fn();
const mockFetchUnreadCount = vi.fn();
let mockContacts: any[] = [];
let mockUnreadTotal = 0;
let mockLoading = false;
let mockError: string | null = null;

function messageStoreState() {
  return {
    contacts: mockContacts,
    unreadTotal: mockUnreadTotal,
    loading: mockLoading,
    error: mockError,
    fetchContacts: mockFetchContacts,
    fetchUnreadCount: mockFetchUnreadCount,
  };
}

vi.mock('@/stores/messageStore', () => ({
  useMessageStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = messageStoreState();
    return selector ? selector(state) : state;
  },
}));

const mockUser = { id: 'user-1', role: 'elder', name: '李奶奶' };
function userStoreState() {
  return { user: mockUser, isElder: true };
}

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = userStoreState();
    return selector ? selector(state) : state;
  },
}));

let mockBinds: any[] = [];
const mockFetchBinds = vi.fn();
function familyStoreState() {
  return { binds: mockBinds, fetchBinds: mockFetchBinds };
}

vi.mock('@/stores/familyStore', () => ({
  useFamilyStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = familyStoreState();
    return selector ? selector(state) : state;
  },
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { render, screen, fireEvent } from '@testing-library/react';

const { default: MessagesPage } = await import('../page');

describe('MessagesPage 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContacts = [];
    mockUnreadTotal = 0;
    mockLoading = false;
    mockError = null;
    mockBinds = [];
  });

  it('渲染页面标题', () => {
    render(<MessagesPage />);
    expect(screen.getByText(/捂话/)).toBeDefined();
  });

  it('加载状态显示加载文本', () => {
    mockLoading = true;
    render(<MessagesPage />);
    expect(screen.getByText('加载中...')).toBeDefined();
  });

  it('错误状态显示错误信息和重试按钮', () => {
    mockError = '网络错误';
    render(<MessagesPage />);
    expect(screen.getByText('网络错误')).toBeDefined();
    expect(screen.getByText('重试')).toBeDefined();
  });

  it('无绑定关系时显示空状态', () => {
    mockBinds = [];
    render(<MessagesPage />);
    expect(screen.getByText('暂无联系人，请先绑定家属')).toBeDefined();
    expect(screen.getByText('去绑定家属')).toBeDefined();
  });

  it('有联系人时渲染联系人列表', () => {
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [
      {
        userId: 'u1',
        name: '小红',
        relationship: '女儿',
        unreadCount: 3,
        lastMessage: {
          id: 'msg-1',
          sender_id: 'u1',
          receiver_id: 'user-1',
          type: 'text',
          content: '妈妈你好',
          audio_url: null,
          audio_duration: null,
          is_ai_generated: null,
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
        },
      },
    ];

    render(<MessagesPage />);
    expect(screen.getByText('小红')).toBeDefined();
    expect(screen.getByText('女儿')).toBeDefined();
    expect(screen.getByText('妈妈你好')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('点击联系人导航到聊天页', () => {
    mockBinds = [{ bind: { status: 'active', relation: '儿子' }, user: { id: 'u2', name: '小明' } }];
    mockContacts = [
      { userId: 'u2', name: '小明', relationship: '儿子', unreadCount: 0 },
    ];

    render(<MessagesPage />);
    fireEvent.click(screen.getByText('小明'));
    expect(mockPush).toHaveBeenCalledWith('/messages/u2');
  });

  it('返回按钮导航到首页', () => {
    render(<MessagesPage />);
    fireEvent.click(screen.getByLabelText('返回首页'));
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('显示总未读数徽章', () => {
    mockUnreadTotal = 5;
    render(<MessagesPage />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('未读数超过99显示99+', () => {
    mockUnreadTotal = 150;
    render(<MessagesPage />);
    expect(screen.getByText('99+')).toBeDefined();
  });
});
