/**
 * 家属/老人详情页测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------- Mock ----------

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockElderUser = {
  id: 'elder-1',
  name: '张奶奶',
  phone: '13800000001',
  role: 'elder',
  last_active_at: null,
};
const mockFamilyUser = {
  id: 'family-1',
  name: '张小明',
  phone: '13900000001',
  role: 'family',
  last_active_at: new Date(Date.now() - 5 * 60000).toISOString(),
};

// 可变状态对象（通过对象引用保持响应性）
const mockState = {
  currentUser: mockElderUser as Record<string, unknown>,
  isElderMode: true,
  currentBinds: [
    {
      bind: { elder_id: 'elder-1', family_id: 'family-1', relation: '儿子', status: 'active' },
      user: mockFamilyUser as Record<string, unknown>,
    },
  ],
};

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: mockState.currentUser, isElder: mockState.isElderMode }),
}));

vi.mock('@/stores/familyStore', () => ({
  useFamilyStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      binds: mockState.currentBinds,
      healthSummaries: {},
      fetchElderHealthSummary: vi.fn(),
    }),
}));

vi.mock('@/stores/healthStore', () => ({
  useHealthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ latestRecords: {}, fetchLatest: vi.fn() }),
  formatHealthValue: vi.fn(() => '--'),
  RECORD_TYPE_CONFIG: {
    blood_pressure: { label: '血压', icon: '🩸', unit: 'mmHg' },
  },
}));

vi.mock('@/stores/medicineStore', () => ({
  useMedicineStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ todayTimeline: [], todayProgress: 0, fetchTodayTimeline: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn().mockResolvedValue([]),
}));

// 在 mock 之后导入
const { default: FamilyDetailClient } = await import('../FamilyDetailClient');


// ---------- 老年人端测试 ----------

describe('FamilyDetailClient — 老年人端', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.currentUser = mockElderUser;
    mockState.isElderMode = true;
    mockState.currentBinds = [
      {
        bind: { elder_id: 'elder-1', family_id: 'family-1', relation: '儿子', status: 'active' },
        user: mockFamilyUser,
      },
    ];
  });

  it('渲染家属姓名和关系', () => {
    render(<FamilyDetailClient userId="family-1" />);
    expect(screen.getByText('张小明')).toBeTruthy();
    expect(screen.getByText('儿子')).toBeTruthy();
  });

  it('显示最近在线时间', () => {
    render(<FamilyDetailClient userId="family-1" />);
    expect(screen.getByText(/分钟前/)).toBeTruthy();
  });

  it('显示打电话和发消息按钮', () => {
    render(<FamilyDetailClient userId="family-1" />);
    expect(screen.getByRole('button', { name: /打电话/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /发消息/ })).toBeTruthy();
  });

  it('点击发消息跳转到聊天页', () => {
    render(<FamilyDetailClient userId="family-1" />);
    fireEvent.click(screen.getByRole('button', { name: /发消息/ }));
    expect(mockPush).toHaveBeenCalledWith('/messages/family-1');
  });

  it('点击返回调用 router.back', () => {
    render(<FamilyDetailClient userId="family-1" />);
    fireEvent.click(screen.getByRole('button', { name: /返回/ }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('老年人端显示家属信息区块', () => {
    render(<FamilyDetailClient userId="family-1" />);
    expect(screen.getByRole('region', { name: '家属信息' })).toBeTruthy();
  });

  it('未找到用户时显示提示', () => {
    render(<FamilyDetailClient userId="unknown-id" />);
    expect(screen.getByText('未找到该用户信息')).toBeTruthy();
  });

  it('last_active_at 为 null 时显示"未知"', () => {
    mockState.currentBinds = [
      {
        bind: { elder_id: 'elder-1', family_id: 'family-1', relation: '儿子', status: 'active' },
        user: { ...mockFamilyUser, last_active_at: null },
      },
    ];
    render(<FamilyDetailClient userId="family-1" />);
    expect(screen.getByText(/未知/)).toBeTruthy();
  });
});

// ---------- 家属端测试 ----------

describe('FamilyDetailClient — 家属端', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.currentUser = mockFamilyUser;
    mockState.isElderMode = false;
    mockState.currentBinds = [
      {
        bind: { elder_id: 'elder-1', family_id: 'family-1', relation: '奶奶', status: 'active' },
        user: mockElderUser,
      },
    ];
  });

  it('家属端显示健康数据区块', () => {
    render(<FamilyDetailClient userId="elder-1" />);
    expect(screen.getByRole('region', { name: '健康数据' })).toBeTruthy();
  });

  it('家属端显示今日用药区块', () => {
    render(<FamilyDetailClient userId="elder-1" />);
    expect(screen.getByRole('region', { name: '今日用药' })).toBeTruthy();
  });

  it('家属端显示AI对话记录区块', () => {
    render(<FamilyDetailClient userId="elder-1" />);
    expect(screen.getByRole('region', { name: 'AI对话记录' })).toBeTruthy();
  });

  it('今日无用药计划时显示提示', () => {
    render(<FamilyDetailClient userId="elder-1" />);
    expect(screen.getByText('今日暂无用药计划')).toBeTruthy();
  });

  it('家属端不显示家属信息区块', () => {
    render(<FamilyDetailClient userId="elder-1" />);
    expect(screen.queryByRole('region', { name: '家属信息' })).toBeNull();
  });

  it('家属端显示老人姓名', () => {
    render(<FamilyDetailClient userId="elder-1" />);
    expect(screen.getByText('张奶奶')).toBeTruthy();
  });

  it('家属端显示关系标签', () => {
    render(<FamilyDetailClient userId="elder-1" />);
    expect(screen.getByText('奶奶')).toBeTruthy();
  });
});
