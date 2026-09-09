import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const { default: QuestionnairePage } = await import('../page');

describe('QuestionnairePage', () => {
  it('展示问卷引言并开始填写第一模块', () => {
    render(<QuestionnairePage />);

    expect(screen.getByRole('heading', { name: '健康早筛' })).toBeInTheDocument();
    expect(screen.getAllByText('关爱同行').length).toBeGreaterThan(0);
    expect(screen.getByText('同济医学院 · 慧老智治 医心为民')).toBeInTheDocument();
    expect(screen.getByText(/共\s*8\s*部分，可一页一页填写/)).toBeInTheDocument();
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
    expect(introCss).toMatch(/\.meta\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(introCss).toMatch(/\.eyebrow\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(pageCss).toMatch(/\.footer\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(pageCss).toMatch(/\.footer\s*\{[\s\S]*font-size:\s*var\(--font-small\)/);
  });
});
