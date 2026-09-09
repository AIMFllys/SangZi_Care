import type { ReactNode } from 'react';

/**
 * App Router template 每次导航都会重新挂载，用来给内容区做统一淡入。
 * TabBar / Splash 在 ClientShell 里，不参与这次动画。
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
