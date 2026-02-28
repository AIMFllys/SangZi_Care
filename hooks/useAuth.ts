// ============================================================
// 桑梓智护 — 自动登录与路由守卫 Hook
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { ROUTES } from '@/lib/constants';

/** 不需要认证的公开路由 */
const PUBLIC_ROUTES: string[] = [ROUTES.LOGIN];

interface UseAuthReturn {
  /** 初始化是否完成 */
  isReady: boolean;
  /** 用户是否已认证 */
  isAuthenticated: boolean;
}

/**
 * 自动登录 + 路由守卫
 *
 * 在 App 挂载时：
 * 1. 调用 `userStore.initialize()` 校验 Token 并拉取用户信息
 * 2. 未认证 → 跳转 /login
 * 3. 已认证但无角色 → 跳转 /onboarding
 * 4. 已认证且有角色 → 放行
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const pathname = usePathname();
  const initialize = useUserStore((s) => s.initialize);
  const user = useUserStore((s) => s.user);

  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const authed = await initialize();

      if (cancelled) return;

      setIsAuthenticated(authed);
      setIsReady(true);

      const isPublic = PUBLIC_ROUTES.includes(pathname);

      if (!authed && !isPublic) {
        router.replace(ROUTES.LOGIN);
        return;
      }

      if (authed && isPublic) {
        // 已登录用户访问登录页 → 跳转首页
        router.replace(ROUTES.HOME);
        return;
      }

      if (authed) {
        // 获取最新的 user（initialize 已经 set 过了）
        const currentUser = useUserStore.getState().user;
        if (currentUser && !currentUser.role && pathname !== ROUTES.ONBOARDING) {
          router.replace(ROUTES.ONBOARDING);
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [initialize, pathname, router]);

  return { isReady, isAuthenticated };
}
