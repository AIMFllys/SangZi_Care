import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  retry: vi.fn(),
  care: {
    recipient: {
      id: 'elder-1',
      name: '王奶奶',
      relation: '奶奶',
      avatarUrl: null,
      permissions: {
        canViewHealth: true,
        canEditHealth: true,
        canEditMedication: true,
        canReceiveEmergency: true,
      },
    },
    recipients: [{ id: 'elder-1', name: '王奶奶' }],
    targetUserId: 'elder-1',
    isLoading: false,
  },
  dashboard: {
    data: {
      target_user_id: 'elder-1',
      date: '2026-07-14',
      access: { health: true, medication: true },
      todayMedication: { completed: 2, total: 3, rate: 67 },
      medicationAdherence: [
        { date: '2026-07-13', planned: 2, completed: 2, rate: 100 },
        { date: '2026-07-14', planned: 3, completed: 2, rate: 67 },
      ],
      adherence7d: 86,
      latestVitals: {
        blood_pressure: {
          id: 'bp-1',
          record_type: 'blood_pressure',
          values: { systolic: 128, diastolic: 78 },
          measured_at: '2026-07-14T08:00:00.000Z',
          is_abnormal: false,
          abnormal_reason: null,
        },
        heart_rate: {
          id: 'hr-1',
          record_type: 'heart_rate',
          values: { value: 72 },
          measured_at: '2026-07-14T08:00:00.000Z',
          is_abnormal: false,
          abnormal_reason: null,
        },
      },
      heartRateTrend: [
        { date: '2026-07-13', value: 70 },
        { date: '2026-07-14', value: 72 },
      ],
      abnormalCount7d: 1,
      updatedAt: '2026-07-14T08:30:00.000Z',
    },
    loading: false,
    error: null,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/hooks/useCareRecipient', () => ({
  useCareRecipient: () => mocks.care,
}));

vi.mock('@/hooks/useCareDashboard', () => ({
  useCareDashboard: () => ({ ...mocks.dashboard, retry: mocks.retry }),
}));

vi.mock('@/components/family/CareRecipientTabs', () => ({
  CareRecipientTabs: () => <div aria-label="照护长辈切换">王奶奶</div>,
}));

const { default: FamilyHomeView } = await import('../FamilyHomeView');

describe('FamilyHomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dashboard.data.access.health = true;
    mocks.dashboard.data.access.medication = true;
  });

  it('展示当前长辈的用药、健康和趋势统计', () => {
    render(<FamilyHomeView />);

    expect(screen.getByText('正在照护 · 王奶奶')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('86%')).toBeInTheDocument();
    expect(screen.getByText('128/78')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /近七日用药依从率/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /近七日心率趋势，最新 72 次每分/ })).toBeInTheDocument();
  });

  it('通知和快捷操作进入对应页面', () => {
    render(<FamilyHomeView />);

    fireEvent.click(screen.getByRole('button', { name: '查看版本通知' }));
    expect(mocks.push).toHaveBeenCalledWith('/notifications');

    fireEvent.click(screen.getByRole('button', { name: /代录健康/ }));
    expect(mocks.push).toHaveBeenCalledWith('/health/input');

    fireEvent.click(screen.getByRole('button', { name: /设置用药/ }));
    expect(mocks.push).toHaveBeenCalledWith('/medicine');
  });

  it('分域权限关闭时显示锁定说明而不是零统计', () => {
    mocks.dashboard.data.access.health = false;
    mocks.dashboard.data.access.medication = false;

    render(<FamilyHomeView />);

    expect(screen.getAllByText('长辈尚未授权查看用药').length).toBeGreaterThan(0);
    expect(screen.getByText('长辈尚未授权查看健康')).toBeInTheDocument();
    expect(screen.queryByText('今日没有计划')).not.toBeInTheDocument();
    const vitals = screen.getByRole('region', { name: '最新健康指标' });
    for (const button of within(vitals).getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  it('滚动看板按内容高度排布，健康指标不会被网格压扁', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'app/page.module.css'),
      'utf8',
    );
    const contentRule = css.match(/\.familyContent\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(contentRule).toMatch(/grid-auto-rows:\s*max-content/);
    expect(contentRule).toMatch(/align-content:\s*start/);
  });
});
