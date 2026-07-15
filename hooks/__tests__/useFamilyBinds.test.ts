import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'family-1' } as { id: string } | null,
  binds: [] as unknown[],
  fetchBinds: vi.fn(),
  isLoading: false,
  error: null as string | null,
  ownerUserId: null as string | null,
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (value: { user: typeof state.user }) => unknown) =>
    selector({ user: state.user }),
}));

vi.mock('@/stores/familyStore', () => ({
  useFamilyStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

const { useFamilyBinds } = await import('../useFamilyBinds');

describe('useFamilyBinds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = { id: 'family-1' };
    state.binds = [];
    state.isLoading = false;
    state.error = null;
    state.ownerUserId = null;
  });

  it('每个账号只自动初始化一次，合法空列表不会反复请求', () => {
    const view = renderHook(() => useFamilyBinds());
    expect(state.fetchBinds).toHaveBeenCalledOnce();
    expect(state.fetchBinds).toHaveBeenCalledWith('family-1');

    state.ownerUserId = 'family-1';
    view.rerender();
    expect(state.fetchBinds).toHaveBeenCalledOnce();
  });

  it('透传当前账号的错误，并提供显式重试', () => {
    state.ownerUserId = 'family-1';
    state.error = '绑定加载失败';

    const { result } = renderHook(() => useFamilyBinds());
    expect(result.current.error).toBe('绑定加载失败');

    act(() => result.current.retry());
    expect(state.fetchBinds).toHaveBeenCalledWith('family-1');
  });
});
