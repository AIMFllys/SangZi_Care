import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BirthDateField } from '../BirthDateField';

function choosePart(label: string, option: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

describe('BirthDateField', () => {
  it('不使用原生 select / date，点选面板拼出 ISO 日期', () => {
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <>
          <BirthDateField value={value} onChange={setValue} />
          <p data-testid="iso">{value || '(empty)'}</p>
        </>
      );
    }
    render(<Harness />);

    expect(document.querySelector('select')).toBeNull();
    expect(document.querySelector('input[type="date"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '出生年份' }));
    expect(screen.getByRole('dialog', { name: '选择年份' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: '1948' }));
    expect((screen.getByRole('button', { name: '出生年份' })).textContent).toContain('1948');
    expect(screen.getByTestId('iso')).toHaveTextContent('(empty)');
    choosePart('出生月份', '2');
    choosePart('出生哪一天', '29');
    expect(screen.getByTestId('iso')).toHaveTextContent('1948-02-29');
  }, 15_000);

  it('闰日在非闰年会收成当月最后一天', () => {
    const onChange = vi.fn();
    render(<BirthDateField value="1948-02-29" onChange={onChange} />);
    choosePart('出生年份', '1949');
    expect(onChange).toHaveBeenLastCalledWith('1949-02-28');
  }, 15_000);

  it('触发按钮允许收缩，选择面板用固定层避免被页面裁切', () => {
    const css = readFileSync(resolve(process.cwd(), 'components/ui/BirthDateField.module.css'), 'utf8');
    expect(css).toMatch(/\.row\s*\{[\s\S]*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.trigger\s*\{[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.overlay\s*\{[\s\S]*position:\s*fixed/);
    expect(css).toContain('.slotYear');
  });
});
