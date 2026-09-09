import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BirthDateField } from '../BirthDateField';

describe('BirthDateField', () => {
  it('用年/月/日选择器拼出 ISO 日期，中途选择不会被清空', () => {
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

    expect(document.querySelector('input[type="date"]')).toBeNull();
    fireEvent.change(screen.getByLabelText('出生年份'), { target: { value: '1948' } });
    expect((screen.getByLabelText('出生年份') as HTMLSelectElement).value).toBe('1948');
    expect(screen.getByTestId('iso')).toHaveTextContent('(empty)');
    fireEvent.change(screen.getByLabelText('出生月份'), { target: { value: '02' } });
    expect((screen.getByLabelText('出生月份') as HTMLSelectElement).value).toBe('02');
    fireEvent.change(screen.getByLabelText('出生哪一天'), { target: { value: '29' } });
    expect(screen.getByTestId('iso')).toHaveTextContent('1948-02-29');
  });

  it('闰日在非闰年会收成当月最后一天', () => {
    const onChange = vi.fn();
    render(<BirthDateField value="1948-02-29" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('出生年份'), { target: { value: '1949' } });
    expect(onChange).toHaveBeenLastCalledWith('1949-02-28');
  });
});
