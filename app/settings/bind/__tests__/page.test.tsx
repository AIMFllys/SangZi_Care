import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchApi: vi.fn(),
  fetchBinds: vi.fn(),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => ({ isReady: true, isAuthenticated: true }),
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'elder-1', role: 'elder' }, isElder: true }),
}));

vi.mock('@/stores/familyStore', () => ({
  useFamilyStore: () => ({ fetchBinds: mocks.fetchBinds }),
}));

vi.mock('@/lib/api', () => ({
  fetchApi: (...args: unknown[]) => mocks.fetchApi(...args),
}));

const activeBind = {
  id: 'bind-1',
  elder_id: 'elder-1',
  family_id: 'family-1',
  relation: '女儿',
  status: 'active',
  bind_code: '123456',
  can_view_health: false,
  can_edit_health: false,
  can_edit_medication: true,
  can_receive_emergency: true,
  bound_at: '2026-07-14T00:00:00.000Z',
  created_at: '2026-07-14T00:00:00.000Z',
  expires_at: null,
  peer: {
    id: 'family-1',
    name: '王女士',
    phone: null,
    avatar_url: null,
    last_active_at: null,
    role: 'family',
  },
};

const { default: BindManagementPage } = await import('../page');

describe('绑定管理权限开关', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchApi.mockImplementation(
      async (url: string, options?: { method?: string; body?: Record<string, unknown> }) => {
        if (url === '/api/v1/family/binds' && !options) return [activeBind];
        if (url === '/api/v1/family/binds/bind-1' && options?.method === 'PATCH') {
          return { ...activeBind, ...options.body };
        }
        throw new Error(`未处理的测试请求：${url}`);
      },
    );
  });

  it('复用原生按钮 Switch，支持键盘聚焦并暴露标准状态语义', async () => {
    render(<BindManagementPage />);

    const control = await screen.findByRole('switch', { name: '查看健康数据' });
    expect(control.tagName).toBe('BUTTON');
    expect(control).toHaveAttribute('type', 'button');
    expect(control).toHaveAttribute('aria-checked', 'false');
    expect(control).not.toBeDisabled();

    control.focus();
    expect(control).toHaveFocus();
    expect(control.tabIndex).toBe(0);
  });

  it('提交目标布尔值并在服务端响应后同步开关状态', async () => {
    render(<BindManagementPage />);

    const control = await screen.findByRole('switch', { name: '查看健康数据' });
    fireEvent.click(control);

    await waitFor(() => {
      expect(mocks.fetchApi).toHaveBeenCalledWith('/api/v1/family/binds/bind-1', {
        method: 'PATCH',
        body: { can_view_health: true },
      });
    });
    await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'true'));
  });
});
