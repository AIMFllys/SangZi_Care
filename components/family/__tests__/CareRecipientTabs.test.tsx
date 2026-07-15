import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  selectRecipient: vi.fn(),
  care: {
    recipient: { id: 'elder-2' },
    recipients: [
      { id: 'elder-1', name: '李阿姨', relation: '母亲', avatarUrl: null },
      { id: 'elder-2', name: '王奶奶', relation: '奶奶', avatarUrl: null },
    ],
    isFamily: true,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/hooks/useCareRecipient', () => ({
  useCareRecipient: () => ({
    ...mocks.care,
    selectRecipient: mocks.selectRecipient,
  }),
}));

const { CareRecipientTabs } = await import('../CareRecipientTabs');

describe('CareRecipientTabs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('按 ID 标记当前长辈并切换照护对象', () => {
    render(<CareRecipientTabs />);

    expect(
      screen.getByRole('tab', { name: /王奶奶/ }).getAttribute('aria-selected'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: /李阿姨/ }));
    expect(mocks.selectRecipient).toHaveBeenCalledWith('elder-1');
  });

  it('可从添加按钮进入家庭绑定', () => {
    render(<CareRecipientTabs showAdd />);

    fireEvent.click(screen.getByRole('button', { name: '添加照护长辈' }));
    expect(mocks.push).toHaveBeenCalledWith('/settings/bind');
  });
});
