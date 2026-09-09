import { renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useEdgeOverscrollLock } from '../useEdgeOverscrollLock';

describe('useEdgeOverscrollLock', () => {
  it('在顶部继续下拉时阻止默认刷新手势，容器仍可滚动时不拦截', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 800 });
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: 400 });
    element.scrollTop = 0;

    const add = vi.spyOn(element, 'addEventListener');
    const ref = createRef<HTMLElement>();
    Object.defineProperty(ref, 'current', { value: element, writable: true });

    renderHook(() => useEdgeOverscrollLock(ref));

    const move = add.mock.calls.find(([type]) => type === 'touchmove')?.[1] as
      | EventListener
      | undefined;
    const start = add.mock.calls.find(([type]) => type === 'touchstart')?.[1] as
      | EventListener
      | undefined;
    expect(move).toBeTypeOf('function');
    expect(start).toBeTypeOf('function');

    start?.(new TouchEvent('touchstart', {
      touches: [{ clientY: 40 } as Touch],
    }));

    const topEvent = new TouchEvent('touchmove', {
      touches: [{ clientY: 80 } as Touch],
      cancelable: true,
    });
    const prevent = vi.spyOn(topEvent, 'preventDefault');
    move?.(topEvent);
    expect(prevent).toHaveBeenCalled();

    element.scrollTop = 120;
    const midEvent = new TouchEvent('touchmove', {
      touches: [{ clientY: 20 } as Touch],
      cancelable: true,
    });
    const midPrevent = vi.spyOn(midEvent, 'preventDefault');
    move?.(midEvent);
    expect(midPrevent).not.toHaveBeenCalled();
  });
});
