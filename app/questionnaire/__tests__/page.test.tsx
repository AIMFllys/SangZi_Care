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
    expect(screen.getByText('同济医学院 · 慧老智治 医心为民')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '开始填写' }));
    expect(screen.getByText('基础信息 & 家庭关怀')).toBeInTheDocument();
    expect(screen.getByText('1. 您的年龄段是？')).toBeInTheDocument();
  });
});
