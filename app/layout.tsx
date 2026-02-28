'use client';

import { ReactNode, useEffect, useState } from 'react';
import '@/styles/globals.css';
import '@/styles/elder-theme.css';
import '@/styles/family-theme.css';
import EmergencyFAB from '@/components/ui/EmergencyFAB';

export type UserRole = 'elder' | 'family';

/**
 * 根布局 — 基于用户角色切换 data-theme 属性
 *
 * 主题切换逻辑：
 * 1. 初始化时从 localStorage 读取已保存的角色
 * 2. 默认使用老年人端主题（elder）
 * 3. 角色变更时更新 data-theme 并持久化到 localStorage
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
      // localStorage 不可用时静默失败
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
        {children}
        <EmergencyFAB />
      </body>
    </html>
  );
}
