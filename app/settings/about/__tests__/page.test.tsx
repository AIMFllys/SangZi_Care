import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back }) }));

const { default: AboutPage } = await import('../page');

describe('AboutPage', () => {
  it('展示项目归属与 v1.2.0 版本', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 2, name: '智护银龄' })).toBeInTheDocument();
    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
    expect(
      screen.getByText('华中科技大学基础医学院“慧老智治医心为民”AI智慧医养暑期实践项目'),
    ).toBeInTheDocument();
  });

  it('返回按钮遵循访问历史', () => {
    render(<AboutPage />);
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(back).toHaveBeenCalledOnce();
  });
});
