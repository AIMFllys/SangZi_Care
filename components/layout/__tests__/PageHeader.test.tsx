import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageHeader from '../PageHeader';

describe('PageHeader', () => {
  it('detail 变体提供左右槽位并把标题放在中央单元格', () => {
    render(
      <PageHeader
        title="家属详情"
        variant="detail"
        backHref="/"
        rightAction={<button type="button">更多</button>}
      />,
    );

    const header = screen.getByRole('banner');
    const title = screen.getByRole('heading', { name: '家属详情' });

    expect(header).toHaveAttribute('data-variant', 'detail');
    expect(header.querySelector('[data-header-slot="left"]')).toBeInTheDocument();
    expect(header.querySelector('[data-header-slot="center"]')).toContainElement(
      title,
    );
    expect(header.querySelector('[data-header-slot="right"]')).toBeInTheDocument();
  });
});
