import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TabBar from '../TabBar';

const navigation = vi.hoisted(() => ({
  pathname: '/health',
  role: 'elder' as 'elder' | 'family',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      user: {
        id: 'user-1',
        name: '测试用户',
        role: navigation.role,
      },
    }),
}));

afterEach(() => {
  cleanup();
  navigation.pathname = '/health';
  navigation.role = 'elder';
});

describe('TabBar', () => {
  it('长辈端渲染五个同级导航项并标记唯一当前项', () => {
    render(<TabBar />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links.filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
    expect(screen.getByRole('link', { name: '功能' }).className).not.toContain(
      'tabCenter',
    );
    expect(screen.getByRole('link', { name: '看板' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('家属端使用相同的五项结构和当前页语义', () => {
    navigation.role = 'family';
    navigation.pathname = '/';

    render(<TabBar />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links.filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
    expect(screen.getByRole('link', { name: '语音' }).className).not.toContain(
      'tabCenter',
    );
    expect(screen.getByRole('link', { name: '看板' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('公开角色到标签和目的地的共享构建器', async () => {
    const tabBarModule = await import('../TabBar');

    expect(tabBarModule).toHaveProperty('TAB_ITEMS');
    if (!('TAB_ITEMS' in tabBarModule)) return;

    const elderItems = tabBarModule.TAB_ITEMS('elder');
    const familyItems = tabBarModule.TAB_ITEMS('family');

    expect(elderItems.map(({ label, href }) => [label, href])).toEqual([
      ['语音', '/'],
      ['亲属', '/messages'],
      ['功能', '/medicine'],
      ['看板', '/health'],
      ['我的', '/settings'],
    ]);
    expect(familyItems.map(({ label, href }) => [label, href])).toEqual([
      ['看板', '/'],
      ['消息', '/messages'],
      ['语音', '/voice'],
      ['健康', '/health'],
      ['设置', '/settings'],
    ]);
  });

  it('导航内容高度不被边框从 border-box 中扣减', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'components/layout/TabBar.module.css'),
      'utf8',
    );
    const tabBarRule = css.match(/\.tabBar\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(tabBarRule).toContain(
      'height: calc(var(--tabbar-content-height) + var(--safe-bottom))',
    );
    expect(tabBarRule).not.toContain('border-top');
    expect(tabBarRule).toMatch(/inset\s+0\s+1px\s+0/);
  });

  it('当前项不使用局部圆形高亮并把镂空图标填色', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'components/layout/TabBar.module.css'),
      'utf8',
    );
    const activeRule = css.match(/\.tabActive\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const activeIconRule =
      css.match(/\.tabActive\s+\.tabIcon\s+svg\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(activeRule).toContain('background-color: transparent');
    expect(activeIconRule).toContain('fill: currentColor');
  });

  it.each([
    ['elder', '/radio', '功能'],
    ['family', '/radio', '语音'],
    ['family', '/medicine', '健康'],
  ] as const)('%s 在 %s 仍有唯一当前导航项 %s', (role, pathname, label) => {
    navigation.role = role;
    navigation.pathname = pathname;

    render(<TabBar />);

    const links = screen.getAllByRole('link');
    expect(links.filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
