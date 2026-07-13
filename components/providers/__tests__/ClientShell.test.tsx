import type { ReactNode } from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientShell from '../ClientShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/messages/family-1',
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/providers/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/TabBar', () => ({
  default: () => <div data-testid="tabbar" />,
}));

describe('ClientShell', () => {
  it('为详情路由设置 detail 模式并隐藏全局 TabBar', () => {
    render(<ClientShell>详情内容</ClientShell>);

    expect(screen.getByRole('main')).toHaveAttribute(
      'data-shell-mode',
      'detail',
    );
    expect(screen.queryByTestId('tabbar')).not.toBeInTheDocument();
  });
});
