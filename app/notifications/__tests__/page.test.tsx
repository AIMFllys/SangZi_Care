import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back }) }));

const { default: NotificationsPage } = await import('../page');

describe('NotificationsPage', () => {
  it('展示 v1.3.0 更新通知和四类更新内容', () => {
    render(<NotificationsPage />);
    expect(screen.getByText('智护银龄 v1.3.0')).toBeInTheDocument();
    expect(screen.getByText('健康早筛问卷')).toBeInTheDocument();
    expect(screen.getByText('开屏更有温度')).toBeInTheDocument();
    expect(screen.getByText('登录前先说明')).toBeInTheDocument();
    expect(screen.getByText('登录步骤更清楚')).toBeInTheDocument();
  });

  it('返回按钮遵循访问历史', () => {
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(back).toHaveBeenCalledOnce();
  });
});
