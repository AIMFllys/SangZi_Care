import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSwipeGesture, type SwipeCallbacks } from '../useSwipeGesture';
import { createRef, type RefObject } from 'react';

// ---------------------------------------------------------------------------
// jsdom doesn't ship Touch / TouchEvent — provide minimal polyfills.
// ---------------------------------------------------------------------------

class FakeTouch {
  identifier: number;
  target: EventTarget;
  clientX: number;
  clientY: number;
  constructor(init: { identifier: number; target: EventTarget; clientX: number; clientY: number }) {
    this.identifier = init.identifier;
    this.target = init.target;
    this.clientX = init.clientX;
    this.clientY = init.clientY;
  }
}

function makeTouchEvent(
  type: 'touchstart' | 'touchend',
  el: HTMLElement,
  clientX: number,
  clientY: number,
): Event {
  const touch = new FakeTouch({ identifier: 0, target: el, clientX, clientY });
  const event = new Event(type, { bubbles: true, cancelable: true });

  if (type === 'touchstart') {
    Object.defineProperty(event, 'touches', { value: [touch] });
  }
  if (type === 'touchend') {
    Object.defineProperty(event, 'changedTouches', { value: [touch] });
  }
  return event;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createElementRef(): RefObject<HTMLDivElement | null> {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const ref = createRef<HTMLDivElement>();
  (ref as { current: HTMLDivElement }).current = el;
  return ref;
}

function simulateSwipe(
  el: HTMLElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration = 100,
) {
  el.dispatchEvent(makeTouchEvent('touchstart', el, startX, startY));
  vi.advanceTimersByTime(duration);
  el.dispatchEvent(makeTouchEvent('touchend', el, endX, endY));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSwipeGesture', () => {
  let ref: RefObject<HTMLDivElement | null>;
  let callbacks: Required<SwipeCallbacks>;

  beforeEach(() => {
    vi.useFakeTimers();
    ref = createElementRef();
    callbacks = {
      onSwipeUp: vi.fn(),
      onSwipeDown: vi.fn(),
      onSwipeLeft: vi.fn(),
      onSwipeRight: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up appended elements
    document.body.innerHTML = '';
  });

  // --- Direction detection ---

  it('calls onSwipeRight for a rightward swipe', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    simulateSwipe(ref.current!, 100, 200, 200, 200);
    expect(callbacks.onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeLeft for a leftward swipe', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    simulateSwipe(ref.current!, 200, 200, 100, 200);
    expect(callbacks.onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeDown for a downward swipe', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    simulateSwipe(ref.current!, 200, 100, 200, 200);
    expect(callbacks.onSwipeDown).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeUp for an upward swipe', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    simulateSwipe(ref.current!, 200, 200, 200, 100);
    expect(callbacks.onSwipeUp).toHaveBeenCalledTimes(1);
  });

  // --- Dominant axis ---

  it('uses dominant axis — horizontal wins when dx > dy', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    // dx = 80, dy = 30 → horizontal
    simulateSwipe(ref.current!, 100, 200, 180, 230);
    expect(callbacks.onSwipeRight).toHaveBeenCalledTimes(1);
    expect(callbacks.onSwipeDown).not.toHaveBeenCalled();
  });

  it('uses dominant axis — vertical wins when dy > dx', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    // dx = 30, dy = 80 → vertical
    simulateSwipe(ref.current!, 200, 100, 230, 180);
    expect(callbacks.onSwipeDown).toHaveBeenCalledTimes(1);
    expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
  });

  // --- Threshold: minimum distance ---

  it('ignores swipes shorter than 50px', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    // dx = 30, dy = 10 → below threshold
    simulateSwipe(ref.current!, 100, 200, 130, 210);
    expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
    expect(callbacks.onSwipeDown).not.toHaveBeenCalled();
  });

  // --- Threshold: maximum time ---

  it('ignores swipes that take longer than 300ms', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    // 400ms duration → too slow
    simulateSwipe(ref.current!, 100, 200, 250, 200, 400);
    expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
  });

  // --- Boundary: exactly at threshold ---

  it('recognises a swipe of exactly 50px', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));
    simulateSwipe(ref.current!, 100, 200, 150, 200);
    expect(callbacks.onSwipeRight).toHaveBeenCalledTimes(1);
  });

  // --- Missing callbacks ---

  it('does not throw when a direction callback is undefined', () => {
    renderHook(() => useSwipeGesture(ref, { onSwipeUp: vi.fn() }));
    // Swipe right — no onSwipeRight provided
    expect(() => {
      simulateSwipe(ref.current!, 100, 200, 200, 200);
    }).not.toThrow();
  });

  // --- Cleanup ---

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(ref.current!, 'removeEventListener');
    const { unmount } = renderHook(() => useSwipeGesture(ref, callbacks));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    removeSpy.mockRestore();
  });

  // --- Null ref ---

  it('does nothing when ref.current is null', () => {
    const nullRef = createRef<HTMLDivElement>();
    expect(() => {
      renderHook(() => useSwipeGesture(nullRef, callbacks));
    }).not.toThrow();
  });

  // --- preventDefault ---

  it('calls preventDefault on the touchend event for recognised swipes', () => {
    renderHook(() => useSwipeGesture(ref, callbacks));

    const el = ref.current!;

    el.dispatchEvent(makeTouchEvent('touchstart', el, 100, 200));
    vi.advanceTimersByTime(100);

    const touchEndEvent = makeTouchEvent('touchend', el, 200, 200);
    const preventSpy = vi.spyOn(touchEndEvent, 'preventDefault');
    el.dispatchEvent(touchEndEvent);

    expect(preventSpy).toHaveBeenCalled();
  });
});
