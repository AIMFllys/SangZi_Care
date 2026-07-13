import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SETTINGS_PAGES = [
  'app/settings/page.tsx',
  'app/settings/profile/page.tsx',
  'app/settings/bind/page.tsx',
  'app/settings/accessibility/page.tsx',
] as const;

describe('设置页壳层', () => {
  it.each(SETTINGS_PAGES)('%s 不重复创建全局壳层', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');

    expect(source).not.toContain('device-wrapper');
    expect(source).not.toContain('page-content');
  });
});
