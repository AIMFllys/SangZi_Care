import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '../Switch';

describe('Switch', () => {
  it('提供标准 switch 语义并回传切换值', () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        checked={false}
        onCheckedChange={onCheckedChange}
        aria-label="定时提醒"
      />,
    );

    const control = screen.getByRole('switch', { name: '定时提醒' });
    expect(control.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('禁用时不可触发', () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        checked
        disabled
        onCheckedChange={onCheckedChange}
        aria-label="定时提醒"
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: '定时提醒' }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
