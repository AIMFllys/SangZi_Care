import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MedicineTimeline } from '../MedicineTimeline';
import type { TodayTimelineItem, MedicationPlanResponse } from '@/stores/medicineStore';

// Mock CSS modules
vi.mock('../MedicineTimeline.module.css', () => ({
  default: new Proxy({}, { get: (_t, prop) => String(prop) }),
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

function makeItem(overrides: Partial<TodayTimelineItem> = {}): TodayTimelineItem {
  return {
    plan: makePlan(),
    scheduled_time: '08:00',
    record: null,
    status: 'pending',
    ...overrides,
  };
}

describe('MedicineTimeline', () => {
  it('空列表显示空状态', () => {
    render(<MedicineTimeline items={[]} />);
    expect(screen.getByText('今日暂无用药计划')).toBeTruthy();
  });

  it('渲染药品名称和剂量', () => {
    const items = [
      makeItem({
        plan: makePlan({ medicine_name: '降压药', dosage: '50mg' }),
      }),
    ];
    render(<MedicineTimeline items={items} />);
    expect(screen.getByText('降压药')).toBeTruthy();
    expect(screen.getByText('50mg')).toBeTruthy();
  });

  it('待服用状态显示"已吃药"按钮', () => {
    const items = [makeItem({ status: 'pending' })];
    render(<MedicineTimeline items={items} />);
    expect(screen.getByText('已吃药')).toBeTruthy();
  });

  it('已完成状态显示"已服用"标签', () => {
    const items = [makeItem({ status: 'taken' })];
    render(<MedicineTimeline items={items} />);
    expect(screen.getByText('已服用 ✓')).toBeTruthy();
  });

  it('点击"已吃药"按钮触发 onConfirm', () => {
    const onConfirm = vi.fn();
    const items = [
      makeItem({
        plan: makePlan({ id: 'p1' }),
        scheduled_time: '08:00',
        status: 'pending',
      }),
    ];
    render(<MedicineTimeline items={items} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('已吃药'));
    expect(onConfirm).toHaveBeenCalledWith('p1', '08:00');
  });

  it('按时段分组渲染', () => {
    const items = [
      makeItem({ scheduled_time: '08:00' }),
      makeItem({
        plan: makePlan({ id: 'p2', medicine_name: '维生素' }),
        scheduled_time: '12:30',
      }),
      makeItem({
        plan: makePlan({ id: 'p3', medicine_name: '钙片' }),
        scheduled_time: '20:00',
      }),
    ];
    render(<MedicineTimeline items={items} />);

    // 检查时段标签
    expect(screen.getByText('🌅 早上')).toBeTruthy();
    expect(screen.getByText('☀️ 中午')).toBeTruthy();
    expect(screen.getByText('🌙 晚上')).toBeTruthy();
  });

  it('delayed 状态也显示"已吃药"按钮', () => {
    const items = [makeItem({ status: 'delayed' })];
    render(<MedicineTimeline items={items} />);
    expect(screen.getByText('已吃药')).toBeTruthy();
  });

  it('skipped 状态显示"已跳过"标签', () => {
    const items = [makeItem({ status: 'skipped' })];
    render(<MedicineTimeline items={items} />);
    expect(screen.getByText('已跳过')).toBeTruthy();
  });
});
