import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function ruleValue(css: string, selector: string, property: string): number {
  const match = css.match(new RegExp(
    `\\.${selector}\\s*\\{[\\s\\S]*?${property}:\\s*(\\d+)`,
  ));
  if (!match) throw new Error(`缺少 ${selector}.${property} CSS 契约`);
  return Number(match[1]);
}

describe('联系人偏好对话框移动端层级契约', () => {
  it('全屏遮罩高于固定 TabBar，背景不能盖住或截获对话框操作', () => {
    const dialogCss = readFileSync(resolve(
      process.cwd(),
      'components/messages/ContactPreferenceDialog.module.css',
    ), 'utf8');
    const tabBarCss = readFileSync(resolve(
      process.cwd(),
      'components/layout/TabBar.module.css',
    ), 'utf8');

    expect(dialogCss).toMatch(/\.overlay\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;/);
    expect(ruleValue(dialogCss, 'overlay', 'z-index'))
      .toBeGreaterThan(ruleValue(tabBarCss, 'tabBar', 'z-index'));
  });
});
