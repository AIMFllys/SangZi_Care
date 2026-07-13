import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MedicinePage from '../page';

const fetchTodayTimeline = vi.fn();
const confirmMedication = vi.fn().mockResolvedValue(undefined);
const fetchApi = vi.fn().mockResolvedValue({ id: 'emergency-1' });
const push = vi.fn();

const timeline = [
  {
    plan: { id: 'plan-1', medicine_name: '降压药', dosage: '1片' },
    scheduled_time: '08:00',
    status: 'pending',
  },
  {
    plan: { id: 'plan-2', medicine_name: '维生素', dosage: '1粒' },
    scheduled_time: '12:00',
    status: 'pending',
  },
];

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'elder-1', role: 'elder' } }),
}));
vi.mock('@/stores/medicineStore', () => ({
  useMedicineStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      todayTimeline: timeline,
      isLoading: false,
      error: null,
      fetchTodayTimeline,
      confirmMedication,
    }),
}));
vi.mock('@/lib/api', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

describe('MedicinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('提醒态只聚焦当前药物，延后后进入今日时间线且没有无效日期箭头', () => {
    render(<MedicinePage />);

    expect(screen.getByText('降压药')).toBeInTheDocument();
    expect(screen.queryByText('维生素')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '15分钟后再提醒' }));

    expect(screen.getByRole('heading', { name: '用药管家' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '上一天' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一天' })).not.toBeInTheDocument();
    expect(screen.getByText('维生素 · 1粒')).toBeInTheDocument();
  });

  it('SOS 调用真实紧急呼叫接口', async () => {
    render(<MedicinePage />);
    fireEvent.click(screen.getByRole('button', { name: 'SOS 紧急呼叫' }));

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith('/api/v1/emergency/trigger', {
        method: 'POST',
        body: { trigger_method: 'button' },
      });
    });
  });
});
