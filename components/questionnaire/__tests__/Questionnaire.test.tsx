import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Questionnaire } from '../Questionnaire';
import { QUESTIONNAIRE_SECTIONS } from '@/lib/data/questionnaire';

describe('Questionnaire', () => {
  it('切换部分时滚回顶部，下滑后显示回到顶部按钮', () => {
    const scrollTo = vi.fn();
    HTMLElement.prototype.scrollTo = scrollTo;

    render(<Questionnaire sections={QUESTIONNAIRE_SECTIONS.slice(0, 2)} />);
    fireEvent.click(screen.getByRole('button', { name: '开始填写' }));

    const first = QUESTIONNAIRE_SECTIONS[0];
    for (const question of first.questions) {
      const group = screen.getByRole(question.type === 'checkbox' ? 'group' : 'radiogroup', {
        name: question.label,
      });
      fireEvent.click(within(group).getByText(question.options[0]));
    }

    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '下一部分' }));
    expect(screen.getByRole('heading', { name: QUESTIONNAIRE_SECTIONS[1].title })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.mock.calls.some((args) => args[0] === 0 || args[0]?.top === 0)).toBe(true);

    const scroller = screen.getByTestId('questionnaire-scroller');
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 160, writable: true });
    fireEvent.scroll(scroller);
    expect(screen.getByRole('button', { name: '回到顶部' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '回到顶部' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('全部模块都能点选选项并进入结果，不使用原生 radio', () => {
    render(<Questionnaire sections={QUESTIONNAIRE_SECTIONS} />);

    fireEvent.click(screen.getByRole('button', { name: '开始填写' }));
    expect(document.querySelector('input[type="radio"]')).toBeNull();
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    expect(document.querySelector('fieldset')).toBeNull();

    for (const section of QUESTIONNAIRE_SECTIONS) {
      expect(screen.getByRole('heading', { name: section.title })).toBeInTheDocument();

      for (const question of section.questions) {
        const group = screen.getByRole(question.type === 'checkbox' ? 'group' : 'radiogroup', {
          name: question.label,
        });
        fireEvent.click(within(group).getByText(question.options[0]));
        expect(within(group).getByText(question.options[0]).closest('[aria-checked]')).toHaveAttribute(
          'aria-checked',
          'true',
        );
      }

      const nextLabel = section === QUESTIONNAIRE_SECTIONS.at(-1)
        ? '查看我的健康回执'
        : '下一部分';
      fireEvent.click(screen.getByRole('button', { name: nextLabel }));
    }

    expect(screen.getByText('健康回执')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新填写' })).toBeInTheDocument();
  }, 20_000);
});
