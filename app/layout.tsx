import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import '@/styles/elder-theme.css';
import '@/styles/family-theme.css';
import ClientShell from '@/components/providers/ClientShell';

export const metadata: Metadata = {
  title: '桑梓智护 — AI智慧医养助手',
  description: '面向老年人的智慧医养助手，语音优先的双端联动关怀平台。AI对话、健康记录、用药管家、紧急呼叫，让子女安心。',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * 根布局 — Server Component
 * 客户端逻辑（主题切换、认证、路由守卫、底部导航）迁移至 ClientShell
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <div className="device-wrapper">
          <ClientShell>
            {children}
          </ClientShell>
        </div>
      </body>
    </html>
  );
}
