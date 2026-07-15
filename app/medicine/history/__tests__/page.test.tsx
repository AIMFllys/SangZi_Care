import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MedicineHistoryPage from '../page';
import type { MedicationPlanResponse } from '@/stores/medicineStore';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock medicineStore
const mockFetchAllPlans = vi.fn();
const mockStoreState = {
  plans: [] as MedicationPlanResponse[],
  plansTargetKey: 'elder-7' as string | null,
  isLoading: false,
  error: null as string | null,
  fetchAllPlans: mockFetchAllPlans,
};

interface MockRecipient {
  id: string;
  name: string;
  permissions: { canEditMedication: boolean };
}

const mockCareState: {
  recipient: MockRecipient | null;
  targetUserId: string | null;
  isFamily: boolean;
  isLoading: boolean;
} = {
  recipient: {
    id: 'elder-7',
    name: '李奶奶',
    permissions: { canEditMedication: true },
  },
  targetUserId: 'elder-7',
  isFamily: true,
  isLoading: false,
};

vi.mock('@/stores/medicineStore', () => ({
  useMedicineStore: (selector?: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') return selector(mockStoreState);
    return mockStoreState;
  },
}));

vi.mock('@/hooks/useCareRecipient', () => ({
  useCareRecipient: () => mockCareState,
}));

// ---------- 辅助工厂 ----------

function makePlan(overrides: Partial<MedicationPlanResponse> = {}): MedicationPlanResponse {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    medicine_name: '阿司匹林',
    dosage: '100mg',
    schedule_times: ['08:00'],
    repeat_days: null,
    start_date: '2024-01-01',
    end_date: null,
    is_active: true,
    created_by: null,
    unit: null,
    notes: null,
    side_effects: null,
    remind_enabled: true,
    remind_before_minutes: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

describe('MedicineHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.plans = [];
    mockStoreState.plansTargetKey = 'elder-7';
    mockStoreState.isLoading = false;
    mockStoreState.error = null;
    mockCareState.recipient = {
      id: 'elder-7',
      name: '李奶奶',
      permissions: { canEditMedication: true },
    };
    mockCareState.targetUserId = 'elder-7';
    mockCareState.isFamily = true;
    mockCareState.isLoading = false;
  });

  it('页面加载时只查询当前照护长辈的全部计划', () => {
    render(<MedicineHistoryPage />);
    expect(mockFetchAllPlans).toHaveBeenCalledWith('elder-7');
  });

  it('显示页面标题和返回链接', () => {
    render(<MedicineHistoryPage />);
    expect(screen.getByText('李奶奶的用药历史')).toBeTruthy();
    expect(screen.getByLabelText('返回')).toBeTruthy();
  });

  it('返回链接指向用药管家页', () => {
    render(<MedicineHistoryPage />);
    const backLink = screen.getByLabelText('返回');
    expect(backLink.closest('a')?.getAttribute('href')).toBe('/medicine');
  });

  it('加载中显示加载状态', () => {
    mockStoreState.isLoading = true;
    render(<MedicineHistoryPage />);
    expect(screen.getByText('加载中...')).toBeTruthy();
  });

  it('错误时显示错误信息和重试按钮', () => {
    mockStoreState.error = '网络错误';
    render(<MedicineHistoryPage />);
    expect(screen.getByText('网络错误')).toBeTruthy();
    expect(screen.getByText('重试')).toBeTruthy();
  });

  it('点击重试按钮重新加载', () => {
    mockStoreState.error = '网络错误';
    render(<MedicineHistoryPage />);
    fireEvent.click(screen.getByText('重试'));
    // 初始加载 + 重试 = 至少2次
    expect(mockFetchAllPlans).toHaveBeenCalledTimes(2);
    expect(mockFetchAllPlans).toHaveBeenLastCalledWith('elder-7');
  });

  it('家属尚无有效照护目标时不回退查询本人', () => {
    mockCareState.recipient = null;
    mockCareState.targetUserId = null;

    render(<MedicineHistoryPage />);

    expect(mockFetchAllPlans).not.toHaveBeenCalled();
    expect(screen.getByText('请先选择照护长辈')).toBeTruthy();
  });

  it('照护目标加载期间先显示加载状态且不发起本人查询', () => {
    mockCareState.recipient = null;
    mockCareState.targetUserId = null;
    mockCareState.isLoading = true;

    render(<MedicineHistoryPage />);

    expect(screen.getByText('加载中...')).toBeTruthy();
    expect(mockFetchAllPlans).not.toHaveBeenCalled();
  });

  it('切换长辈期间不把旧目标计划显示在新标题下', () => {
    mockStoreState.plans = [makePlan({ medicine_name: '旧目标药物' })];
    mockStoreState.plansTargetKey = 'elder-7';
    mockCareState.recipient = {
      id: 'elder-8',
      name: '王爷爷',
      permissions: { canEditMedication: true },
    };
    mockCareState.targetUserId = 'elder-8';

    render(<MedicineHistoryPage />);

    expect(mockFetchAllPlans).toHaveBeenCalledWith('elder-8');
    expect(screen.getByText('加载中...')).toBeTruthy();
    expect(screen.queryByText('旧目标药物')).toBeNull();
  });

  it('无计划时显示空状态提示', () => {
    render(<MedicineHistoryPage />);
    expect(screen.getByText('暂无当前用药计划')).toBeTruthy();
    expect(screen.getByText('暂无历史用药记录')).toBeTruthy();
  });

  it('正确分组显示当前用药和历史用药', () => {
    mockStoreState.plans = [
      makePlan({ id: 'p1', medicine_name: '降压药', is_active: true }),
      makePlan({ id: 'p2', medicine_name: '维生素D', is_active: false }),
    ];
    render(<MedicineHistoryPage />);

    expect(screen.getByText('当前用药')).toBeTruthy();
    expect(screen.getByText('历史用药')).toBeTruthy();
    expect(screen.getByText('降压药')).toBeTruthy();
    expect(screen.getByText('维生素D')).toBeTruthy();
  });

  it('卡片显示药品名称、剂量、服药时间和日期范围', () => {
    mockStoreState.plans = [
      makePlan({
        id: 'p1',
        medicine_name: '阿莫西林',
        dosage: '250mg',
        schedule_times: ['08:00', '20:00'],
        start_date: '2024-03-01',
        end_date: '2024-06-30',
        is_active: true,
      }),
    ];
    render(<MedicineHistoryPage />);

    expect(screen.getByText('阿莫西林')).toBeTruthy();
    expect(screen.getByText('250mg')).toBeTruthy();
    expect(screen.getByText('08:00')).toBeTruthy();
    expect(screen.getByText('20:00')).toBeTruthy();
    expect(screen.getByText('2024/03/01 ~ 2024/06/30')).toBeTruthy();
  });

  it('无结束日期时显示"起"', () => {
    mockStoreState.plans = [
      makePlan({
        id: 'p1',
        start_date: '2024-01-15',
        end_date: null,
        is_active: true,
      }),
    ];
    render(<MedicineHistoryPage />);
    expect(screen.getByText('2024/01/15 起')).toBeTruthy();
  });

  it('多个活跃计划全部显示在当前用药区域', () => {
    mockStoreState.plans = [
      makePlan({ id: 'p1', medicine_name: '药品A', is_active: true }),
      makePlan({ id: 'p2', medicine_name: '药品B', is_active: true }),
    ];
    render(<MedicineHistoryPage />);

    expect(screen.getByText('药品A')).toBeTruthy();
    expect(screen.getByText('药品B')).toBeTruthy();
    expect(screen.getByText('暂无历史用药记录')).toBeTruthy();
  });
});
