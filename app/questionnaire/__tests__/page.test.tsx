import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  user: {
    id: 'u1',
    name: '王奶奶',
    role: 'elder',
    birth_date: '1950-05-15',
    gender: 'female',
  } as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => ({ isReady: true, isAuthenticated: true }),
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: mocks.user }),
}));

const { default: QuestionnairePage } = await import('../page');

describe('QuestionnairePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = {
      id: 'u1',
      name: '王奶奶',
      role: 'elder',
      birth_date: '1950-05-15',
      gender: 'female',
    };
  });

  it('展示问卷引言并开始填写第一模块', () => {
    render(<QuestionnairePage />);

    expect(screen.getByRole('heading', { name: '健康早筛' })).toBeInTheDocument();
    expect(screen.getAllByText('关爱同行').length).toBeGreaterThan(0);
    expect(screen.getByText('同济医学院 · 慧老智治 医心为民')).toBeInTheDocument();
    expect(screen.getByText(/当前资料：女/)).toBeInTheDocument();
    expect(screen.getByText(/共\s*7\s*部分，可一页一页填写/)).toBeInTheDocument();
    expect(screen.getByText('每一份回答，都在为家庭与社区贡献力量')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '开始填写' }));
    expect(screen.getByText('基础信息 & 家庭关怀')).toBeInTheDocument();
    expect(screen.getByText('1. 您的年龄段是？')).toBeInTheDocument();
  });

  it('问卷滚动容器吞掉过度滚动，避免上拉触发整页刷新', () => {
    const pageCss = readFileSync(resolve(process.cwd(), 'app/questionnaire/page.module.css'), 'utf8');
    const css = readFileSync(
      resolve(process.cwd(), 'components/questionnaire/Questionnaire.module.css'),
      'utf8',
    );
    expect(pageCss).toMatch(/\.page\s*\{[\s\S]*overscroll-behavior:\s*none/);
    expect(css).toMatch(/\.scroller\s*\{[\s\S]*overscroll-behavior:\s*none/);
    expect(css).toMatch(/\.scroller\s*\{[\s\S]*touch-action:\s*pan-y/);
    expect(css).toMatch(/\.scroller\s*\{[\s\S]*overflow-anchor:\s*none/);
    expect(css).toContain('.jumpTop');
    expect(css).not.toMatch(/-webkit-overflow-scrolling:\s*touch/);
  });

  it('引言辅助句略缩小且不换行，避免窄屏把关键词拆开', () => {
    const pageCss = readFileSync(resolve(process.cwd(), 'app/questionnaire/page.module.css'), 'utf8');
    const introCss = readFileSync(
      resolve(process.cwd(), 'components/questionnaire/Questionnaire.module.css'),
      'utf8',
    );
    expect(introCss).toMatch(/\.meta[\s\S]*white-space:\s*nowrap/);
    expect(introCss).toMatch(/\.eyebrow\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(pageCss).toMatch(/\.footer\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(pageCss).toMatch(/\.footer\s*\{[\s\S]*font-size:\s*var\(--font-small\)/);
  });

  it('资料不全时弹出补全提示并跳转个人信息', () => {
    mocks.user = {
      id: 'u1',
      name: '王奶奶',
      role: 'elder',
      birth_date: null,
      gender: null,
    };
    render(<QuestionnairePage />);

    expect(screen.getByRole('dialog', { name: '先完善个人信息' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '开始填写' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '去填写' }));
    expect(mocks.replace).toHaveBeenCalledWith('/settings/profile?from=questionnaire');
  });
});
