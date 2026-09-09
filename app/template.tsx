import type { ReactNode } from 'react';
import { PageFade } from '@/components/layout/PageFade';

/**
 * App Router template 每次导航都会重新挂载，用来给内容区做统一淡入。
 * TabBar / Splash 在 ClientShell 里，不参与这次动画。
 */
export default function Template({ children }: { children: ReactNode }) {
  return <PageFade>{children}</PageFade>;
}
