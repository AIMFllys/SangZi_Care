import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MedicineHistoryPage from '../page';
import type { MedicationPlanResponse } from '@/stores/medicineStore';

// Mock CSS modules
vi.mock('../page.module.css', () => ({
  default: new Proxy({}, { get: (_t, prop) => String(prop) }),
}));

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
  isLoading: false,
  error: null as string | null,
  fetchAllPlans: mockFetchAllPlans,
};

vi.mock('@/stores/medicineStore', () => ({
  useMedicineStore: (selector?: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') return selector(mockStoreState);
    return mockStoreState;
  },
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
    mockStoreState.isLoading = false;
    mockStoreState.error = null;
  });

  it('页面加载时调用 fetchAllPlans', () => {
    render(<MedicineHistoryPage />);
    expect(mockFetchAllPlans).toHaveBeenCalled();
  });

  it('显示页面标题和返回链接', () => {
    render(<MedicineHistoryPage />);
    expect(screen.getByText('📋 用药历史')).toBeTruthy();
    expect(screen.getByText('← 返回')).toBeTruthy();
  });

  it('返回链接指向用药管家页', () => {
    render(<MedicineHistoryPage />);
    const backLink = screen.getByText('← 返回');
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
    expect(screen.getByText('🕐 08:00')).toBeTruthy();
    expect(screen.getByText('🕐 20:00')).toBeTruthy();
    expect(screen.getByText('📅 2024/03/01 ~ 2024/06/30')).toBeTruthy();
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
    expect(screen.getByText('📅 2024/01/15 起')).toBeTruthy();
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
