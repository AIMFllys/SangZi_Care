import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('家庭详情 CSS Module 合约', () => {
  it('为组件使用的每个 styles 类定义样式', () => {
    const component = readFileSync(
      resolve(process.cwd(), 'app/family/[id]/FamilyDetailClient.tsx'),
      'utf8',
    );
    const css = readFileSync(
      resolve(process.cwd(), 'app/family/[id]/page.module.css'),
      'utf8',
    );
    const used = [...component.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map((match) => match[1]);
    const defined = new Set(
      [...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)\s*(?:,|\{|:)/g)].map(
        (match) => match[1],
      ),
    );

    expect([...new Set(used)].filter((className) => !defined.has(className))).toEqual([]);
  });
});
