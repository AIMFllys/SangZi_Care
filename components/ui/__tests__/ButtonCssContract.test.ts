import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Button CSS contract', () => {
  it('统一使用 44/48/52px 三档正常高度', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'components/ui/Button.module.css'),
      'utf8',
    );
    const baseRule = css.match(/\.button\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const smallRule = css.match(/\.sm\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const largeRule = css.match(/\.lg\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(baseRule).toContain('min-height: 48px');
    expect(smallRule).toContain('min-height: 44px');
    expect(largeRule).toContain('min-height: 52px');
    expect(css).not.toContain('min-height: 56px');
  });
});
