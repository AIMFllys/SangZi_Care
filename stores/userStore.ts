// ============================================================
// 桑梓智护 — 用户状态管理 (Zustand 5 + persist)
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ApiError, fetchApi } from '@/lib/api';
import type { Tables } from '@/types/supabase';

type User = Tables<'oc_users'>;

interface UserState {
  user: User | null;
  isElder: boolean;
  token: string | null;

  /** 设置用户信息（登录成功后调用） */
  setUser: (user: User) => void;

  /** 更新角色（同时调用后端 API） */
  setRole: (role: 'elder' | 'family') => Promise<void>;

  /** 退出登录，清除所有状态和 localStorage */
  logout: () => void;

  /**
   * 初始化：读取 token，校验有效性，拉取用户信息
   * @returns 是否已认证
   */
  initialize: () => Promise<boolean>;
}

/** 持久化的状态子集 */
type PersistedUserState = Pick<UserState, 'user' | 'token' | 'isElder'>;

/** SSR 安全的 localStorage 访问 */
const safeStorage = createJSONStorage<PersistedUserState>(() => {
  if (typeof window === 'undefined') {
    // SSR 环境返回空操作
    return {
      getItem: () => null,
      setItem: () => { },
      removeItem: () => { },
    };
  }
  return localStorage;
});

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isElder: true,
      token: null,

      setUser: (user: User) => {
        set({
          user,
          isElder: user.role === 'elder',
        });
        // 同步角色到 layout 使用的 localStorage key
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_role', user.role);
        }
      },

      setRole: async (role: 'elder' | 'family') => {
        const { user } = get();
        if (!user) return;

        // 乐观更新
        set({
          user: { ...user, role },
          isElder: role === 'elder',
        });

        // 同步到 layout 主题
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_role', role);
          document.documentElement.setAttribute('data-theme', role);
        }

        try {
          await fetchApi('/api/v1/users/me/role', {
            method: 'PATCH',
            body: { role },
          });
        } catch {
          // 回滚
          set({
            user: { ...user },
            isElder: user.role === 'elder',
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('user_role', user.role);
            document.documentElement.setAttribute('data-theme', user.role);
          }
        }
      },

      logout: () => {
        set({ user: null, isElder: true, token: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user-store');
        }
      },

      initialize: async () => {
        if (typeof window === 'undefined') return false;

        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refresh_token');
        if (!token && !refreshToken) {
          set({ user: null, token: null });
          return false;
        }

        set({ token });

        try {
          // fetchApi 内部会在 401 时自动用 refresh_token 续期
          const user = await fetchApi<User>('/api/v1/users/me');
          // 重新读取 token（可能已被 fetchApi 刷新）
          const latestToken = localStorage.getItem('token');
          set({
            user,
            isElder: user.role === 'elder',
            token: latestToken,
          });
          // 同步角色到 layout
          localStorage.setItem('user_role', user.role);
          return true;
        } catch (error) {
          // 只有服务端明确判定凭证无效时才退出登录。网络中断、页面卸载
          // 取消请求或临时 5xx 不得销毁仍可续期的本地会话。
          if (!(error instanceof ApiError) || error.status !== 401) {
            return get().user !== null;
          }

          set({ user: null, isElder: true, token: null });
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user-store');
          return false;
        }
      },
    }),
    {
      name: 'user-store',
      storage: safeStorage,
      // 只持久化 user 和 token，isElder 从 user.role 派生
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isElder: state.isElder,
      }),
    },
  ),
);
