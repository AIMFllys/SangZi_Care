import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildTTSText } from '../ReminderModal';
import type { TodayTimelineItem, MedicationPlanResponse } from '@/stores/medicineStore';

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

function makeTimelineItem(
  overrides: Partial<TodayTimelineItem> = {},
): TodayTimelineItem {
  return {
    plan: makePlan(),
    scheduled_time: '08:00',
    record: null,
    status: 'pending',
    ...overrides,
  };
}

// ---------- buildTTSText 纯函数测试 ----------

describe('buildTTSText', () => {
  it('空列表返回空字符串', () => {
    expect(buildTTSText([])).toBe('');
  });

  it('单个药品生成正确播报文本', () => {
    const items = [
      makeTimelineItem({
        plan: makePlan({ medicine_name: '阿司匹林', dosage: '100mg' }),
      }),
    ];
    expect(buildTTSText(items)).toBe('现在该吃药了。阿司匹林 100mg');
  });

  it('多个药品用逗号分隔', () => {
    const items = [
      makeTimelineItem({
        plan: makePlan({ id: 'p1', medicine_name: '阿司匹林', dosage: '100mg' }),
      }),
      makeTimelineItem({
        plan: makePlan({ id: 'p2', medicine_name: '二甲双胍', dosage: '500mg' }),
        scheduled_time: '08:00',
      }),
    ];
    expect(buildTTSText(items)).toBe(
      '现在该吃药了。阿司匹林 100mg，二甲双胍 500mg',
    );
  });
});

// ---------- ReminderModal 组件行为测试 ----------

// Mock 依赖
const mockSpeak = vi.fn();
const mockStop = vi.fn();
vi.mock('@/hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    speak: mockSpeak,
    stop: mockStop,
    isSpeaking: false,
    error: null,
    currentLevel: 'web' as const,
    setSpeed: vi.fn(),
  }),
}));

const mockConfirmMedication = vi.fn();
vi.mock('@/stores/medicineStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/medicineStore')>();
  return {
    ...actual,
    useMedicineStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ confirmMedication: mockConfirmMedication }),
  };
});

// 需要在 mock 之后导入
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReminderModal } from '../ReminderModal';

describe('ReminderModal', () => {
  const defaultItems = [
    makeTimelineItem({
      plan: makePlan({ id: 'p1', medicine_name: '阿司匹林', dosage: '100mg' }),
      scheduled_time: '08:00',
      status: 'pending',
    }),
    makeTimelineItem({
      plan: makePlan({ id: 'p2', medicine_name: '二甲双胍', dosage: '500mg' }),
      scheduled_time: '08:00',
      status: 'pending',
    }),
  ];

  const defaultProps = {
    isOpen: true,
    items: defaultItems,
    onClose: vi.fn(),
    onDelay: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('isOpen=false 时不渲染', () => {
    const { container } = render(
      <ReminderModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('items 为空时不渲染', () => {
    const { container } = render(
      <ReminderModal {...defaultProps} items={[]} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('渲染所有药品名称和剂量', () => {
    render(<ReminderModal {...defaultProps} />);

    expect(screen.getByText('阿司匹林')).toBeDefined();
    expect(screen.getByText('100mg')).toBeDefined();
    expect(screen.getByText('二甲双胍')).toBeDefined();
    expect(screen.getByText('500mg')).toBeDefined();
  });

  it('显示时间和标题', () => {
    render(<ReminderModal {...defaultProps} />);

    expect(screen.getByText('该吃药了')).toBeDefined();
    expect(screen.getByText('08:00')).toBeDefined();
  });

  it('渲染"已吃药"和"等会吃"按钮', () => {
    render(<ReminderModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /确认已吃药/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /等会吃/ })).toBeDefined();
  });

  it('打开时自动触发TTS播报', async () => {
    render(<ReminderModal {...defaultProps} />);

    // TTS 在 300ms 延迟后触发
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSpeak).toHaveBeenCalledWith(
      '现在该吃药了。阿司匹林 100mg，二甲双胍 500mg',
    );
  });

  it('点击"已吃药"调用 confirmMedication 并关闭', async () => {
    mockConfirmMedication.mockResolvedValue(undefined);
    render(<ReminderModal {...defaultProps} />);

    const confirmBtn = screen.getByRole('button', { name: /确认已吃药/ });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // 应该为每个 pending 项调用 confirmMedication
    expect(mockConfirmMedication).toHaveBeenCalledTimes(2);
    expect(mockConfirmMedication).toHaveBeenCalledWith('p1', '08:00');
    expect(mockConfirmMedication).toHaveBeenCalledWith('p2', '08:00');
    expect(mockStop).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('点击"等会吃"调用 onDelay', () => {
    render(<ReminderModal {...defaultProps} />);

    const delayBtn = screen.getByRole('button', { name: /等会吃/ });
    fireEvent.click(delayBtn);

    expect(mockStop).toHaveBeenCalled();
    expect(defaultProps.onDelay).toHaveBeenCalled();
  });

  it('ESC键触发"等会吃"行为', () => {
    render(<ReminderModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(mockStop).toHaveBeenCalled();
    expect(defaultProps.onDelay).toHaveBeenCalled();
  });

  it('弹窗具有正确的 ARIA 属性', () => {
    render(<ReminderModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('用药提醒');
  });

  it('药品列表具有 list role', () => {
    render(<ReminderModal {...defaultProps} />);

    const list = screen.getByRole('list', { name: '待服用药品' });
    expect(list).toBeDefined();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });

  it('只确认 pending 和 delayed 状态的药品', async () => {
    const mixedItems = [
      makeTimelineItem({
        plan: makePlan({ id: 'p1', medicine_name: '阿司匹林', dosage: '100mg' }),
        scheduled_time: '08:00',
        status: 'pending',
      }),
      makeTimelineItem({
        plan: makePlan({ id: 'p2', medicine_name: '二甲双胍', dosage: '500mg' }),
        scheduled_time: '08:00',
        status: 'taken', // 已服用，不应再次确认
      }),
      makeTimelineItem({
        plan: makePlan({ id: 'p3', medicine_name: '氨氯地平', dosage: '5mg' }),
        scheduled_time: '08:00',
        status: 'delayed',
      }),
    ];

    mockConfirmMedication.mockResolvedValue(undefined);
    render(<ReminderModal {...defaultProps} items={mixedItems} />);

    const confirmBtn = screen.getByRole('button', { name: /确认已吃药/ });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // 只确认 pending 和 delayed 的项
    expect(mockConfirmMedication).toHaveBeenCalledTimes(2);
    expect(mockConfirmMedication).toHaveBeenCalledWith('p1', '08:00');
    expect(mockConfirmMedication).toHaveBeenCalledWith('p3', '08:00');
  });
});
