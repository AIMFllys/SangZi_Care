import { describe, expect, it } from 'vitest';
import { getShellMode } from '@/lib/shellMode';

describe('getShellMode', () => {
  it.each([
    ['/', 'tabbed'],
    ['/messages', 'tabbed'],
    ['/medicine', 'tabbed'],
    ['/health', 'tabbed'],
    ['/settings', 'tabbed'],
    ['/radio', 'tabbed'],
    ['/messages/family-1', 'detail'],
    ['/medicine/history', 'detail'],
    ['/health/input', 'detail'],
    ['/family/family-1', 'detail'],
    ['/settings/profile', 'detail'],
    ['/settings/bind', 'detail'],
    ['/settings/accessibility', 'detail'],
    ['/login', 'immersive'],
    ['/onboarding', 'immersive'],
    ['/voice', 'immersive'],
  ] as const)('%s is %s', (pathname, mode) => {
    expect(getShellMode(pathname)).toBe(mode);
  });
});
