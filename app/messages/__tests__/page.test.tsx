import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidElement } from 'react';
import { getRelationIcon, formatMessageTime, getMessagePreview } from '@/lib/messageUtils';

// ============================================================
// 纯函数单元测试
// ============================================================

describe('getRelationIcon', () => {
  it('已知关系返回 Lucide 图标元素', () => {
    expect(isValidElement(getRelationIcon('子女'))).toBe(true);
    expect(isValidElement(getRelationIcon('配偶'))).toBe(true);
    expect(isValidElement(getRelationIcon('朋友'))).toBe(true);
  });

  it('未知关系返回默认 User 图标', () => {
    const icon = getRelationIcon('同事');
    expect(isValidElement(icon)).toBe(true);
  });
});

describe('formatMessageTime', () => {
  it('1分钟内的消息显示"刚刚"', () => {
    const now = new Date();
    const justNow = new Date(now.getTime() - 30 * 1000);
    const result = formatMessageTime(justNow.toISOString());
    expect(result).toBe('刚刚');
  });

  it('今天稍早的消息显示相对分钟数', () => {
    const now = new Date();
    const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const result = formatMessageTime(twoMinAgo.toISOString());
    expect(result).toBe('2分钟前');
  });

  it('超过48小时的消息显示"N天前"', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 1);
    const result = formatMessageTime(twoDaysAgo.toISOString());
    expect(result).toBe('2天前');
  });

  it('更早的消息显示月/日', () => {
    const old = new Date('2024-03-15T10:00:00Z');
    const result = formatMessageTime(old.toISOString());
    expect(result).toMatch(/\d+月\d+日/);
  });

  it('空字符串返回空', () => {
    expect(formatMessageTime('')).toBe('');
  });
});

describe('getMessagePreview', () => {
  it('文字消息返回内容', () => {
    expect(getMessagePreview('text', '你好')).toBe('你好');
  });

  it('语音消息返回语音标识', () => {
    expect(getMessagePreview('voice', '')).toBeDefined();
  });

  it('无消息返回空', () => {
    expect(getMessagePreview('text', '')).toBe('');
  });
});

// ============================================================
// 组件渲染测试
// ============================================================

// Mock 依赖
const mockFetchContacts = vi.fn();
const mockUpdateContactPreference = vi.fn();
const mockFetchApi = vi.fn();
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
    contactsOwnerUserId: 'user-1',
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
  return {
    binds: mockBinds,
    fetchBinds: mockFetchBinds,
    updateContactPreference: mockUpdateContactPreference,
    isLoading: false,
    ownerUserId: 'user-1',
    error: null,
  };
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
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));

import { act, render, screen, fireEvent } from '@testing-library/react';

const { default: MessagesPage } = await import('../page');

describe('MessagesPage 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContacts = [];
    mockUnreadTotal = 0;
    mockLoading = false;
    mockError = null;
    mockBinds = [];
    mockFetchApi.mockResolvedValue({ alias: '妈妈', is_pinned: true });
  });

  it('渲染页面标题', () => {
    render(<MessagesPage />);
    expect(screen.getByText(/亲友联系人/)).toBeDefined();
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
    expect(screen.getByText('重新加载')).toBeDefined();
  });

  it('无绑定关系时显示空状态', () => {
    mockBinds = [];
    render(<MessagesPage />);
    expect(screen.getByText('还没有联系人')).toBeDefined();
    expect(screen.getByText('绑定家人后就能聊天啦')).toBeDefined();
    expect(mockFetchContacts).toHaveBeenCalledWith([], 'user-1');
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('短按主按钮进入聊天，更多按钮只打开管理对话框', () => {
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [{ userId: 'u1', name: '小红', relationship: '女儿', unreadCount: 0, isPinned: false }];
    render(<MessagesPage />);
    fireEvent.click(screen.getByRole('button', { name: '管理小红' }));
    expect(screen.getByRole('dialog', { name: '管理小红' })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '和小红聊天' }));
    expect(mockPush).toHaveBeenCalledWith('/messages/u1');
  });

  it('对话框初始聚焦备注，Escape 与遮罩关闭后把焦点还给管理按钮', () => {
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [{ userId: 'u1', name: '小红', relationship: '女儿', unreadCount: 0, isPinned: false }];
    render(<MessagesPage />);
    const manage = screen.getByRole('button', { name: '管理小红' });
    manage.focus();
    fireEvent.click(manage);
    expect(screen.getByRole('textbox', { name: '备注名' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(manage).toHaveFocus();

    fireEvent.click(manage);
    const dialog = screen.getByRole('dialog');
    fireEvent.pointerDown(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(manage).toHaveFocus();
  });

  it('aria-modal 内 Tab 与 Shift+Tab 循环焦点，不逃到背景按钮', () => {
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [{ userId: 'u1', name: '小红', relationship: '女儿', unreadCount: 0, isPinned: false }];
    render(<MessagesPage />);
    fireEvent.click(screen.getByRole('button', { name: '管理小红' }));

    const input = screen.getByRole('textbox', { name: '备注名' });
    const save = screen.getByRole('button', { name: '保存' });
    save.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(input).toHaveFocus();

    input.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();
  });

  it('长按打开管理且抑制合成 click，移动超过阈值会取消', () => {
    vi.useFakeTimers();
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [{ userId: 'u1', name: '小红', relationship: '女儿', unreadCount: 0, isPinned: false }];
    render(<MessagesPage />);
    const item = screen.getByRole('listitem');
    fireEvent.pointerDown(item, { clientX: 10, clientY: 10 });
    act(() => vi.advanceTimersByTime(550));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '和小红聊天' }));
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    fireEvent.pointerDown(item, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(item, { clientX: 30, clientY: 10 });
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('系统右键菜单也打开同一管理对话框', () => {
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [{ userId: 'u1', name: '小红', relationship: '女儿', unreadCount: 0, isPinned: false }];
    render(<MessagesPage />);
    fireEvent.contextMenu(screen.getByRole('listitem'));
    expect(screen.getByRole('dialog', { name: '管理小红' })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('指针在阈值前离开联系人卡片会取消长按', () => {
    vi.useFakeTimers();
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [{ userId: 'u1', name: '小红', relationship: '女儿', unreadCount: 0, isPinned: false }];
    render(<MessagesPage />);
    const item = screen.getByRole('listitem');
    fireEvent.pointerDown(item, { clientX: 10, clientY: 10 });
    fireEvent.pointerLeave(item, { clientX: 12, clientY: 12 });
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('保存失败保留对话框与输入并显示错误', async () => {
    mockFetchApi.mockRejectedValue(new Error('保存失败'));
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [{ userId: 'u1', name: '小红', relationship: '女儿', unreadCount: 0, isPinned: false }];
    render(<MessagesPage />);
    fireEvent.click(screen.getByRole('button', { name: '管理小红' }));
    fireEvent.change(screen.getByRole('textbox', { name: '备注名' }), { target: { value: '女儿' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByRole('textbox', { name: '备注名' })).toHaveValue('女儿');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('保存成功使用发起时 owner 局部更新，且 pending 防止重复提交', async () => {
    let resolveSave!: (value: unknown) => void;
    mockFetchApi.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    mockBinds = [{ bind: { status: 'active', relation: '女儿' }, user: { id: 'u1', name: '小红' } }];
    mockContacts = [{ userId: 'u1', name: '小红', relationship: '女儿', unreadCount: 0, isPinned: false }];
    render(<MessagesPage />);
    fireEvent.click(screen.getByRole('button', { name: '管理小红' }));
    fireEvent.change(screen.getByRole('textbox', { name: '备注名' }), { target: { value: ' 女儿 ' } });
    const save = screen.getByRole('button', { name: '保存' });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(mockFetchApi).toHaveBeenCalledOnce();
    expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/messages/contacts/u1', {
      method: 'PUT',
      body: { alias: '女儿', is_pinned: false },
    });

    resolveSave({ alias: '女儿', is_pinned: false });
    expect(await screen.findByText('添加亲友')).toBeInTheDocument();
    expect(mockUpdateContactPreference).toHaveBeenCalledWith(
      'user-1',
      'u1',
      { alias: '女儿', is_pinned: false },
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('显示添加亲友入口', () => {
    mockBinds = [];
    render(<MessagesPage />);
    expect(screen.getByText('添加亲友')).toBeDefined();
  });
});
