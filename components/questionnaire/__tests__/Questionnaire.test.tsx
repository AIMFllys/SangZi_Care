import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Questionnaire } from '../Questionnaire';
import { QUESTIONNAIRE_SECTIONS } from '@/lib/data/questionnaire';

describe('Questionnaire', () => {
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
