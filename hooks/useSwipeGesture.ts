'use client';

import { useEffect, useRef, useCallback, type RefObject } from 'react';

export interface SwipeCallbacks {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

/** Minimum distance (px) a finger must travel to count as a swipe. */
const MIN_SWIPE_DISTANCE = 50;

/** Maximum duration (ms) for a gesture to qualify as a swipe. */
const MAX_SWIPE_TIME = 300;

/**
 * Attach swipe-gesture listeners (up / down / left / right) to a DOM element.
 *
 * Uses touch events so it works on mobile devices.
 * Recognised swipes call `preventDefault` to avoid scroll interference.
 * Listeners are cleaned up automatically on unmount.
 *
 * @param ref  React ref pointing to the target element
 * @param callbacks  Object with optional `onSwipeUp`, `onSwipeDown`, `onSwipeLeft`, `onSwipeRight`
 */
export function useSwipeGesture(
  ref: RefObject<HTMLElement | null>,
  callbacks: SwipeCallbacks,
): void {
  // Keep callbacks in a ref so the effect doesn't re-run on every render.
  const callbacksRef = useRef<SwipeCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  // Track touch start coordinates & timestamp.
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;
    const elapsed = Date.now() - startTimeRef.current;

    // Must be fast enough to be a swipe, not a scroll / long-press.
    if (elapsed > MAX_SWIPE_TIME) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Must exceed minimum distance on at least one axis.
    if (absDx < MIN_SWIPE_DISTANCE && absDy < MIN_SWIPE_DISTANCE) return;

    // Determine dominant axis.
    if (absDx > absDy) {
      // Horizontal swipe
      if (dx > 0) {
        callbacksRef.current.onSwipeRight?.();
      } else {
        callbacksRef.current.onSwipeLeft?.();
      }
    } else {
      // Vertical swipe
      if (dy > 0) {
        callbacksRef.current.onSwipeDown?.();
      } else {
        callbacksRef.current.onSwipeUp?.();
      }
    }

    // Prevent default scroll behaviour for recognised swipes.
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchEnd]);
}
