'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import TabBar from '@/components/layout/TabBar';
import { AuthProvider, useAuthContext } from '@/components/providers/AuthProvider';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { AuthRequiredDialog } from '@/components/auth/AuthRequiredDialog';
import { SplashScreen } from '@/components/splash/SplashScreen';
import { ROUTES } from '@/lib/constants';
import { getShellMode } from '@/lib/shellMode';
import styles from './ClientShell.module.css';

export type UserRole = 'elder' | 'family';

function isPublicPath(pathname: string): boolean {
  return pathname === ROUTES.LOGIN || pathname.startsWith(`${ROUTES.LOGIN}/`);
}

function ClientShellInner({
  children,
  splashDone,
  onSplashFinished,
}: {
  children: ReactNode;
  splashDone: boolean;
  onSplashFinished: () => void;
}) {
  const [theme, setTheme] = useState<UserRole>('elder');
  const pathname = usePathname();
  const mode = getShellMode(pathname);
  const { isReady, isAuthenticated } = useAuthContext();
  const allowContent = isPublicPath(pathname) || (isReady && isAuthenticated);

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('user_role') as UserRole | null;
      if (savedRole === 'elder' || savedRole === 'family') {
        setTheme(savedRole);
      }
    } catch {
      // localStorage 不可用时使用默认值
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('user_role', theme);
    } catch {
      // 静默失败
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <SplashScreen
        onFinished={onSplashFinished}
        stayVisible={!isReady && !isPublicPath(pathname)}
      />
      <AuthRequiredDialog splashDone={splashDone} />
      <div className={styles.shell} data-shell-mode={mode}>
        <main className={styles.main} data-shell-mode={mode}>
          {allowContent ? children : null}
        </main>
        {mode === 'tabbed' && isReady && isAuthenticated ? <TabBar /> : null}
      </div>
    </ErrorBoundary>
  );
}

/**
 * 客户端壳组件 — data-theme 主题切换 + 全局底部导航 + 认证守卫
 * 外层 .device-wrapper 已移至根布局，以保证所有页面居中约束
 */
export default function ClientShell({ children }: { children: ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);
  const onSplashFinished = useCallback(() => setSplashDone(true), []);

  return (
    <AuthProvider>
      <ClientShellInner splashDone={splashDone} onSplashFinished={onSplashFinished}>
        {children}
      </ClientShellInner>
    </AuthProvider>
  );
}
