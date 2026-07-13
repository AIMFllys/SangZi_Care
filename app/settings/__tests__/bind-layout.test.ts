import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('绑定管理移动端布局', () => {
  it('关系标签保留 48px 适老化触控高度', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'app/settings/bind/page.module.css'),
      'utf8',
    );
    const relationRule = css.match(/\.relationChip\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(relationRule).toMatch(/min-height:\s*48px/);
  });
});
