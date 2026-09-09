import { useEffect, type RefObject } from 'react';

/**
 * 在滚动容器顶/底继续拖时拦截默认手势，避免 Android WebView
 * 把「上滑看上一题」当成整页下拉刷新。
 */
export function useEdgeOverscrollLock(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let startY = 0;

    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const deltaY = event.touches[0].clientY - startY;
      const atTop = element.scrollTop <= 0;
      const atBottom =
        element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
    };
  }, [ref]);
}
