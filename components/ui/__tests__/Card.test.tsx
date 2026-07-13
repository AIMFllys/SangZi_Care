import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Card } from '../Card';

describe('Card', () => {
  it('可点击卡片按 Enter 和 Space 时各触发一次', () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>可操作卡片</Card>);

    const card = screen.getByRole('button', { name: '可操作卡片' });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
