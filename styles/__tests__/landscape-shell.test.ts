// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('手机横屏应用壳', () => {
  it('矮横屏不再浪费 480px 壳层之外的可用宽度', () => {
    const globals = readFileSync(
      resolve(process.cwd(), 'styles/globals.css'),
      'utf8',
    );
    const tabBar = readFileSync(
      resolve(process.cwd(), 'components/layout/TabBar.module.css'),
      'utf8',
    );
    const query = '@media (orientation: landscape) and (min-width: 640px) and (max-height: 600px)';
    const globalLandscape = globals.slice(globals.indexOf(query));
    const tabLandscape = tabBar.slice(tabBar.indexOf(query));

    expect(globalLandscape).toMatch(
      /\.device-wrapper\s*\{[\s\S]*?max-width:\s*none/,
    );
    expect(tabLandscape).toMatch(/\.tabBar\s*\{[\s\S]*?width:\s*100%/);
  });
});
