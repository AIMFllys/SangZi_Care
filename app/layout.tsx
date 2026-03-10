'use client';

import { ReactNode, useEffect, useState } from 'react';
import '@/styles/globals.css';
import '@/styles/elder-theme.css';
import '@/styles/family-theme.css';
import TabBar from '@/components/layout/TabBar';
import { AuthProvider } from '@/components/providers/AuthProvider';

export type UserRole = 'elder' | 'family';

/**
 * 根布局 — data-theme 主题切换 + 全局底部导航
 */
export default function RootLayout({ children }: { children: ReactNode }) {
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
    <html lang="zh-CN" data-theme={theme} suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <title>桑梓智护</title>
      </head>
      <body>
        <div className="device-wrapper">
          <AuthProvider>
            <main className="page-content">
              {children}
            </main>
            <TabBar />
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
