import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefObject } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('为交互式 suffix 提供可收缩槽且保留输入区基础宽度', () => {
    render(
      <Input
        label="验证码"
        value=""
        onChange={vi.fn()}
        suffix={<button type="button">获取验证码</button>}
      />,
    );

    const input = screen.getByRole('textbox', { name: '验证码' });
    const suffixButton = screen.getByRole('button', { name: '获取验证码' });
    const css = readFileSync(
      resolve(process.cwd(), 'components/ui/Input.module.css'),
      'utf8',
    );

    expect(input).toBeInTheDocument();
    expect(suffixButton.parentElement?.className).toContain('suffix');
    expect(css).toMatch(/\.input\s*\{[\s\S]*?flex:\s*1 0 8ch;/);
    expect(css).toMatch(/\.suffix\s*\{[\s\S]*?flex-shrink:\s*1;/);
  });

  it('允许对真实 input 传入焦点 ref', () => {
    const inputRef = { current: null } as RefObject<HTMLInputElement | null>;
    render(<Input label="备注名" value="" onChange={vi.fn()} inputRef={inputRef} />);

    expect(inputRef.current).toBe(screen.getByRole('textbox', { name: '备注名' }));
    inputRef.current?.focus();
    expect(inputRef.current).toHaveFocus();
  });
});
