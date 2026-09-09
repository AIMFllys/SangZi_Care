'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * 路由切换淡入。动画结束后立刻拿掉 animation，避免 Android WebView
 * 在「带 forwards 的透明图层」里滚动、改 DOM 时出现白屏。
 */
export function PageFade({ children }: { children: ReactNode }) {
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEntering(false);
    }
  }, []);

  return (
    <div
      className={entering ? 'page-fade is-entering' : 'page-fade'}
      onAnimationEnd={() => setEntering(false)}
    >
      {children}
    </div>
  );
}
