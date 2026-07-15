import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'family-1', name: '小明', role: 'family' } as Record<string, unknown>,
  isElder: false,
  selectedElderId: 'elder-2' as string | null,
  setSelectedElderId: vi.fn(),
  isLoading: false,
  error: null as string | null,
  retry: vi.fn(),
  binds: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (value: Record<string, unknown>) => unknown) =>
    selector({ user: state.user, isElder: state.isElder }),
}));

vi.mock('@/stores/familyStore', () => ({
  useFamilyStore: (selector: (value: Record<string, unknown>) => unknown) =>
    selector({
      selectedElderId: state.selectedElderId,
      setSelectedElderId: state.setSelectedElderId,
    }),
}));

vi.mock('@/hooks/useFamilyBinds', () => ({
  useFamilyBinds: () => ({
    binds: state.binds,
    isLoading: state.isLoading,
    error: state.error,
    retry: state.retry,
  }),
}));

const { useCareRecipient } = await import('../useCareRecipient');

function bind(elderId: string, name: string, status = 'active') {
  return {
    bind: {
      id: `bind-${elderId}`,
      elder_id: elderId,
      family_id: 'family-1',
      relation: elderId === 'elder-1' ? '母亲' : '奶奶',
      status,
      can_view_health: true,
      can_edit_health: elderId === 'elder-2',
      can_edit_medication: true,
      can_receive_emergency: true,
    },
    user: { id: elderId, name, avatar_url: null },
  };
}

describe('useCareRecipient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = { id: 'family-1', name: '小明', role: 'family' };
    state.isElder = false;
    state.selectedElderId = 'elder-2';
    state.isLoading = false;
    state.error = null;
    state.binds = [bind('elder-1', '李阿姨'), bind('elder-2', '王奶奶')];
  });

  it('家属端跨页面复用已选中的 active 长辈及权限', () => {
    const { result } = renderHook(() => useCareRecipient());

    expect(result.current.targetUserId).toBe('elder-2');
    expect(result.current.recipient?.name).toBe('王奶奶');
    expect(result.current.recipient?.permissions.canEditHealth).toBe(true);
    expect(result.current.isFamily).toBe(true);
  });

  it('只允许选择当前 active 绑定中的长辈', () => {
    const { result } = renderHook(() => useCareRecipient());

    act(() => result.current.selectRecipient('stranger'));
    expect(state.setSelectedElderId).not.toHaveBeenCalled();
    act(() => result.current.selectRecipient('elder-1'));
    expect(state.setSelectedElderId).toHaveBeenCalledWith('elder-1');
  });

  it('长辈端目标始终为本人，不读取家属选择状态', () => {
    state.user = {
      id: 'elder-self',
      name: '赵奶奶',
      role: 'elder',
      avatar_url: null,
    };
    state.isElder = true;

    const { result } = renderHook(() => useCareRecipient());

    expect(result.current.targetUserId).toBe('elder-self');
    expect(result.current.isSelf).toBe(true);
    expect(result.current.recipient?.permissions.canEditMedication).toBe(true);
  });

  it('过滤 inactive 绑定并回退到首位有效长辈', () => {
    state.selectedElderId = 'elder-2';
    state.binds = [bind('elder-1', '李阿姨'), bind('elder-2', '王奶奶', 'inactive')];

    const { result } = renderHook(() => useCareRecipient());

    expect(result.current.targetUserId).toBe('elder-1');
    expect(state.setSelectedElderId).toHaveBeenCalledWith('elder-1');
  });

  it('家属端向页面透传绑定加载错误与重试能力', () => {
    state.error = '家庭绑定加载失败';
    state.binds = [];

    const { result } = renderHook(() => useCareRecipient());

    expect(result.current.error).toBe('家庭绑定加载失败');
    result.current.retry();
    expect(state.retry).toHaveBeenCalledOnce();
  });
});
