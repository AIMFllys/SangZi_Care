'use client';

import { ReactNode, useEffect, useState } from 'react';
import TabBar from '@/components/layout/TabBar';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';

export type UserRole = 'elder' | 'family';

/**
 * 客户端壳组件 — data-theme 主题切换 + 全局底部导航 + 认证守卫
 */
export default function ClientShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<UserRole>('elder');

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
    <div className="device-wrapper" data-theme={theme}>
      <AuthProvider>
        <ErrorBoundary>
          <main className="page-content">
            {children}
          </main>
        </ErrorBoundary>
        <TabBar />
      </AuthProvider>
    </div>
  );
}
