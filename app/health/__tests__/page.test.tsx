import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { HealthRecordResponse } from '@/stores/healthStore';

// ---------- Mock 依赖 ----------

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetchLatest = vi.fn();
const mockFetchTrend = vi.fn();
const mockSetSelectedType = vi.fn();

const mockUser = { id: 'user-1', role: 'elder', name: '李奶奶' };

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: mockUser }),
}));

let mockStoreState = {
  latestRecords: {} as Record<string, HealthRecordResponse | null>,
  trendData: [] as HealthRecordResponse[],
  selectedType: 'blood_pressure',
  loading: false,
  error: null as string | null,
  fetchLatest: mockFetchLatest,
  fetchTrend: mockFetchTrend,
  setSelectedType: mockSetSelectedType,
};

vi.mock('@/stores/healthStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/healthStore')>();
  return {
    ...actual,
    useHealthStore: (selector?: (s: typeof mockStoreState) => unknown) => {
      if (selector) return selector(mockStoreState);
      return mockStoreState;
    },
  };
});

// 导入需要在 mock 之后
import HealthPage from '../page';

// ---------- 辅助工厂 ----------

function makeRecord(
  overrides: Partial<HealthRecordResponse> = {},
): HealthRecordResponse {
  return {
    id: 'rec-1',
    user_id: 'user-1',
    record_type: 'blood_pressure',
    values: { systolic: 120, diastolic: 80 },
    measured_at: '2024-06-15T08:00:00Z',
    input_method: 'manual',
    is_abnormal: false,
    ...overrides,
  };
}

// ---------- 测试 ----------

describe('HealthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      latestRecords: {},
      trendData: [],
      selectedType: 'blood_pressure',
      loading: false,
      error: null,
      fetchLatest: mockFetchLatest,
      fetchTrend: mockFetchTrend,
      setSelectedType: mockSetSelectedType,
    };
  });

  it('渲染页面标题', () => {
    render(<HealthPage />);
    expect(screen.getByText(/健康看板/)).toBeDefined();
  });

  it('初始加载时调用 fetchLatest', () => {
    render(<HealthPage />);
    expect(mockFetchLatest).toHaveBeenCalled();
  });

  it('显示加载状态', () => {
    mockStoreState.loading = true;
    render(<HealthPage />);
    expect(screen.getByText('加载中...')).toBeDefined();
  });

  it('显示错误状态和重试按钮', () => {
    mockStoreState.error = '网络错误';
    render(<HealthPage />);
    expect(screen.getByText('网络错误')).toBeDefined();
    expect(screen.getByText('重新加载')).toBeDefined();
  });

  it('点击重试按钮重新加载', () => {
    mockStoreState.error = '网络错误';
    render(<HealthPage />);

    fireEvent.click(screen.getByText('重新加载'));
    expect(mockFetchLatest).toHaveBeenCalledTimes(2); // 初始 + 重试
  });

  it('渲染健康数据卡片', () => {
    mockStoreState.latestRecords = {
      blood_pressure: makeRecord({
        values: { systolic: 120, diastolic: 80 },
      }),
      heart_rate: makeRecord({
        record_type: 'heart_rate',
        values: { value: 72 },
      }),
    };
    render(<HealthPage />);

    expect(screen.getByText('血压')).toBeDefined();
    expect(screen.getByText('心率')).toBeDefined();
  });

  it('渲染有数据的卡片', () => {
    mockStoreState.latestRecords = {
      blood_pressure: makeRecord({
        values: { systolic: 135, diastolic: 88 },
      }),
    };
    render(<HealthPage />);

    expect(screen.getByText('135/88')).toBeDefined();
  });

  it('点击设置按钮导航到设置页', () => {
    render(<HealthPage />);

    fireEvent.click(screen.getByLabelText('前往设置'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('渲染添加新记录按钮', () => {
    render(<HealthPage />);
    expect(screen.getByText('添加新记录')).toBeDefined();
  });

  it('点击添加新记录按钮导航到录入页', () => {
    render(<HealthPage />);

    fireEvent.click(screen.getByText('添加新记录'));
    expect(mockPush).toHaveBeenCalledWith('/health/input');
  });
});
