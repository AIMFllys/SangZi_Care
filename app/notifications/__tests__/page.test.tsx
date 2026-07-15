import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back }) }));

const { default: NotificationsPage } = await import('../page');

describe('NotificationsPage', () => {
  it('展示 v1.1.0 更新通知和四类更新内容', () => {
    render(<NotificationsPage />);
    expect(screen.getByText('智护银龄 v1.1.0')).toBeInTheDocument();
    expect(screen.getByText('监护看板更清晰')).toBeInTheDocument();
    expect(screen.getByText('健康与用药协作')).toBeInTheDocument();
    expect(screen.getByText('AI 陪伴与碎碎念')).toBeInTheDocument();
    expect(screen.getByText('界面与加载优化')).toBeInTheDocument();
  });

  it('返回按钮遵循访问历史', () => {
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(back).toHaveBeenCalledOnce();
  });
});
