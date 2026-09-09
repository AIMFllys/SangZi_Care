import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/hooks/useAuth';

const mocks = vi.hoisted(() => ({
  initialize: vi.fn<() => Promise<boolean>>(),
  pathname: '/',
  router: { replace: vi.fn() },
  user: { role: 'elder' as const },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
}));

vi.mock('@/stores/userStore', () => {
  const state = { initialize: mocks.initialize };
  const useUserStore = Object.assign(
    (selector: (value: typeof state) => unknown) => selector(state),
    { getState: () => ({ user: mocks.user }) },
  );
  return { useUserStore };
});

describe('useAuth', () => {
  beforeEach(() => {
    mocks.initialize.mockReset();
    mocks.initialize.mockResolvedValue(true);
    mocks.pathname = '/';
    mocks.router.replace.mockReset();
    mocks.user = { role: 'elder' };
  });

  it('客户端路由变化只执行守卫，不重复拉取当前用户', async () => {
    const hook = renderHook(() => useAuth());

    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
    expect(mocks.initialize).toHaveBeenCalledTimes(1);

    mocks.pathname = '/health';
    hook.rerender();

    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(true));
    expect(mocks.initialize).toHaveBeenCalledTimes(1);
  });

  it('未登录访问受保护页时先弹出提示，确认后再进入登录页', async () => {
    mocks.initialize.mockResolvedValue(false);
    const hook = renderHook(() => useAuth());

    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
    expect(hook.result.current.loginPromptOpen).toBe(true);
    expect(mocks.router.replace).not.toHaveBeenCalled();

    act(() => {
      hook.result.current.confirmLoginPrompt();
    });
    expect(mocks.router.replace).toHaveBeenCalledWith('/login');
  });

  it('登录页本身不弹出登录提示', async () => {
    mocks.initialize.mockResolvedValue(false);
    mocks.pathname = '/login';
    const hook = renderHook(() => useAuth());

    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
    expect(hook.result.current.loginPromptOpen).toBe(false);
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});
