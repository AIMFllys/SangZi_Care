import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------- Mock 依赖 ----------

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/settings',
}));

let mockIsElder = true;
const mockSetRole = vi.fn();
const mockLogout = vi.fn();

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      user: { id: 'u1', name: '张三', role: mockIsElder ? 'elder' : 'family' },
      isElder: mockIsElder,
      token: 'test-token',
      setUser: vi.fn(),
      setRole: mockSetRole,
      logout: mockLogout,
      initialize: vi.fn().mockResolvedValue(true),
    };
    return selector(state);
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isReady: true, isAuthenticated: true }),
}));

const { default: SettingsPage } = await import('../page');

// ---------- 测试 ----------

describe('SettingsPage 设置主页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsElder = true;
  });

  it('渲染页面标题', () => {
    render(<SettingsPage />);
    expect(screen.getByText('设置')).toBeDefined();
  });

  it('显示个人信息入口', () => {
    render(<SettingsPage />);
    expect(screen.getByText('个人信息')).toBeDefined();
  });

  it('显示绑定管理入口', () => {
    render(<SettingsPage />);
    expect(screen.getByText('绑定管理')).toBeDefined();
  });

  it('显示无障碍设置入口', () => {
    render(<SettingsPage />);
    expect(screen.getByText('无障碍设置')).toBeDefined();
  });

  it('显示角色切换入口', () => {
    render(<SettingsPage />);
    expect(screen.getByText('角色切换')).toBeDefined();
  });

  it('显示退出登录按钮', () => {
    render(<SettingsPage />);
    expect(screen.getByText('退出登录')).toBeDefined();
  });

  it('老年人端显示长辈模式标签', () => {
    render(<SettingsPage />);
    expect(screen.getByText('长辈模式')).toBeDefined();
  });

  it('点击角色切换显示确认弹窗', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByLabelText(/点击切换到/));
    expect(screen.getByText('切换角色')).toBeDefined();
    expect(screen.getByText(/确定要从/)).toBeDefined();
  });

  it('点击退出登录显示确认弹窗', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByLabelText('退出登录'));
    expect(screen.getByText(/确定要退出登录/)).toBeDefined();
  });

  it('确认退出后调用 logout 并跳转登录页', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByLabelText('退出登录'));
    // 弹窗中的退出按钮
    const buttons = screen.getAllByText('退出登录');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(mockLogout).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('个人信息链接指向正确路由', () => {
    render(<SettingsPage />);
    const link = screen.getByText('个人信息').closest('a');
    expect(link?.getAttribute('href')).toBe('/settings/profile');
  });

  it('绑定管理链接指向正确路由', () => {
    render(<SettingsPage />);
    const link = screen.getByText('绑定管理').closest('a');
    expect(link?.getAttribute('href')).toBe('/settings/bind');
  });

  it('无障碍设置链接指向正确路由', () => {
    render(<SettingsPage />);
    const link = screen.getByText('无障碍设置').closest('a');
    expect(link?.getAttribute('href')).toBe('/settings/accessibility');
  });
});
