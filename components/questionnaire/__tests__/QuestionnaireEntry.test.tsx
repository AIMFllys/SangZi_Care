import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  user: {
    id: 'u1',
    name: '王奶奶',
    role: 'elder',
    birth_date: '1950-05-15',
    gender: 'female',
  } as Record<string, unknown> | null,
  auth: { isReady: true, isAuthenticated: true },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: () => mocks.auth,
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: mocks.user }),
}));

const { QuestionnaireEntry } = await import('../QuestionnaireEntry');

describe('QuestionnaireEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth = { isReady: true, isAuthenticated: true };
    mocks.user = {
      id: 'u1',
      name: '王奶奶',
      role: 'elder',
      birth_date: '1950-05-15',
      gender: 'female',
    };
  });

  it('资料齐全时直接进入问卷', () => {
    render(<QuestionnaireEntry />);
    fireEvent.click(screen.getByRole('button', { name: '打开健康早筛问卷' }));
    expect(mocks.push).toHaveBeenCalledWith('/questionnaire');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('缺少出生日期或明确性别时弹出补全菜单', () => {
    mocks.user = { id: 'u1', name: '王奶奶', role: 'elder', birth_date: null, gender: 'other' };
    render(<QuestionnaireEntry variant="chip" />);
    fireEvent.click(screen.getByRole('button', { name: '打开健康早筛问卷' }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '先完善个人信息' })).toBeInTheDocument();
    expect(screen.getByText(/请先填写出生日期，并选择男或女/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '去填写' }));
    expect(mocks.push).toHaveBeenCalledWith('/settings/profile?from=questionnaire');
  });
});
