import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUserStore } from '../userStore';

// Mock fetchApi
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, fetchApi: vi.fn() };
});

import { ApiError, fetchApi } from '@/lib/api';

const mockFetchApi = fetchApi as ReturnType<typeof vi.fn>;

// ---------- 用户工厂 ----------

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    phone: '13800138000',
    name: '李奶奶',
    role: 'elder' as const,
    avatar_url: null,
    birth_date: null,
    chronic_diseases: null,
    email: null,
    font_size: null,
    gender: null,
    id_card: null,
    last_active_at: null,
    voice_speed: null,
    updated_at: '2024-06-15T08:00:00Z',
    wake_word: null,
    created_at: '2024-06-15T08:00:00Z',
    ...overrides,
  };
}

// ---------- localStorage mock ----------

function mockLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn(() => null),
    _store: store,
  };
}

describe('useUserStore', () => {
  let storage: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', { value: storage, writable: true });
    // Reset store state
    useUserStore.setState({ user: null, isElder: true, token: null });
  });

  describe('初始状态', () => {
    it('默认值正确', () => {
      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isElder).toBe(true);
      expect(state.token).toBeNull();
    });
  });

  describe('setUser', () => {
    it('设置用户信息并派生 isElder', () => {
      const user = makeUser();
      useUserStore.getState().setUser(user);

      const state = useUserStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isElder).toBe(true);
    });

    it('家属角色 isElder 为 false', () => {
      const user = makeUser({ role: 'family' });
      useUserStore.getState().setUser(user);

      expect(useUserStore.getState().isElder).toBe(false);
    });

    it('同步角色到 localStorage user_role', () => {
      const user = makeUser({ role: 'elder' });
      useUserStore.getState().setUser(user);

      expect(storage.setItem).toHaveBeenCalledWith('user_role', 'elder');
    });
  });

  describe('setRole', () => {
    it('无用户时不执行', async () => {
      useUserStore.setState({ user: null });
      await useUserStore.getState().setRole('family');

      expect(mockFetchApi).not.toHaveBeenCalled();
    });

    it('乐观更新角色并调用 API', async () => {
      const user = makeUser({ role: 'elder' });
      useUserStore.setState({ user, isElder: true });
      mockFetchApi.mockResolvedValue({});

      await useUserStore.getState().setRole('family');

      const state = useUserStore.getState();
      expect(state.user?.role).toBe('family');
      expect(state.isElder).toBe(false);
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/users/me/role', {
        method: 'PATCH',
        body: { role: 'family' },
      });
    });

    it('API 失败时回滚', async () => {
      const user = makeUser({ role: 'elder' });
      useUserStore.setState({ user, isElder: true });
      mockFetchApi.mockRejectedValue(new Error('网络错误'));

      await useUserStore.getState().setRole('family');

      const state = useUserStore.getState();
      // 应回滚到原始值
      expect(state.user?.role).toBe('elder');
      expect(state.isElder).toBe(true);
    });
  });

  describe('logout', () => {
    it('清除所有用户状态', () => {
      const user = makeUser();
      useUserStore.setState({ user, isElder: true, token: 'jwt-token' });

      useUserStore.getState().logout();

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isElder).toBe(true);
    });

    it('清除所有 localStorage 条目', () => {
      useUserStore.setState({ user: makeUser(), token: 'jwt' });
      useUserStore.getState().logout();

      expect(storage.removeItem).toHaveBeenCalledWith('token');
      expect(storage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(storage.removeItem).toHaveBeenCalledWith('user_role');
      expect(storage.removeItem).toHaveBeenCalledWith('user-store');
    });
  });

  describe('initialize', () => {
    it('无 token 时返回 false', async () => {
      const result = await useUserStore.getState().initialize();

      expect(result).toBe(false);
      expect(useUserStore.getState().user).toBeNull();
    });

    it('有 token 时获取用户信息', async () => {
      const user = makeUser();
      storage._store['token'] = 'valid-jwt';
      mockFetchApi.mockResolvedValue(user);

      const result = await useUserStore.getState().initialize();

      expect(result).toBe(true);
      expect(useUserStore.getState().user).toEqual(user);
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/users/me');
    });

    it('token 无效时清除状态', async () => {
      storage._store['token'] = 'invalid-jwt';
      mockFetchApi.mockRejectedValue(new ApiError('Unauthorized', 401));

      const result = await useUserStore.getState().initialize();

      expect(result).toBe(false);
      expect(useUserStore.getState().user).toBeNull();
      expect(storage.removeItem).toHaveBeenCalledWith('token');
      expect(storage.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('临时网络错误时保留可恢复会话', async () => {
      const user = makeUser();
      storage._store['token'] = 'valid-jwt';
      storage._store['refresh_token'] = 'valid-refresh';
      storage._store['user_role'] = 'elder';
      storage._store['user-store'] = '{"state":{}}';
      useUserStore.setState({ user, isElder: true, token: 'valid-jwt' });
      mockFetchApi.mockRejectedValue(new ApiError('网络连接失败，请稍后重试', null));

      const result = await useUserStore.getState().initialize();

      expect(result).toBe(true);
      expect(useUserStore.getState().user).toEqual(user);
      expect(storage._store['token']).toBe('valid-jwt');
      expect(storage._store['refresh_token']).toBe('valid-refresh');
      expect(storage.removeItem).not.toHaveBeenCalledWith('token');
      expect(storage.removeItem).not.toHaveBeenCalledWith('refresh_token');
    });

    it('仅有 refresh_token 时尝试初始化', async () => {
      const user = makeUser();
      storage._store['refresh_token'] = 'valid-refresh';
      mockFetchApi.mockResolvedValue(user);

      const result = await useUserStore.getState().initialize();

      expect(result).toBe(true);
      expect(useUserStore.getState().user).toEqual(user);
    });
  });
});
