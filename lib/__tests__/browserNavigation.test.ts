import { describe, expect, it, vi } from 'vitest';

import { replaceDocument } from '@/lib/browserNavigation';

describe('replaceDocument', () => {
  it('通过浏览器 Location 执行整页替换导航', () => {
    const replace = vi.fn();

    replaceDocument('/login', { replace });

    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/login');
  });
});
