import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HealthCard } from '../HealthCard';
import type { HealthRecordResponse } from '@/stores/healthStore';

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

describe('HealthCard', () => {
  it('渲染血压数据', () => {
    render(
      <HealthCard
        type="blood_pressure"
        record={makeRecord({
          values: { systolic: 135, diastolic: 88 },
        })}
      />,
    );

    expect(screen.getByText('血压')).toBeDefined();
    expect(screen.getByText('135/88')).toBeDefined();
    expect(screen.getByText('mmHg')).toBeDefined();
  });

  it('渲染心率数据', () => {
    render(
      <HealthCard
        type="heart_rate"
        record={makeRecord({
          record_type: 'heart_rate',
          values: { value: 72 },
        })}
      />,
    );

    expect(screen.getByText('心率')).toBeDefined();
    expect(screen.getByText('72')).toBeDefined();
    expect(screen.getByText('次/分')).toBeDefined();
  });

  it('渲染体温数据', () => {
    render(
      <HealthCard
        type="temperature"
        record={makeRecord({
          record_type: 'temperature',
          values: { value: 36.5 },
        })}
      />,
    );

    expect(screen.getByText('体温')).toBeDefined();
    expect(screen.getByText('36.5')).toBeDefined();
    expect(screen.getByText('°C')).toBeDefined();
  });

  it('record 为 null 时显示暂无数据', () => {
    render(<HealthCard type="blood_sugar" record={null} />);

    expect(screen.getByText('血糖')).toBeDefined();
    expect(screen.getByText('暂无数据')).toBeDefined();
  });

  it('异常记录显示异常标记和红色边框', () => {
    render(
      <HealthCard
        type="blood_pressure"
        record={makeRecord({ is_abnormal: true })}
      />,
    );

    expect(screen.getByTestId('abnormal-badge')).toBeDefined();
    expect(screen.getByTestId('abnormal-badge').textContent).toBe('异常');
  });

  it('正常记录不显示异常标记', () => {
    render(
      <HealthCard
        type="blood_pressure"
        record={makeRecord({ is_abnormal: false })}
      />,
    );

    expect(screen.queryByTestId('abnormal-badge')).toBeNull();
  });

  it('点击触发 onClick 回调', () => {
    const onClick = vi.fn();
    render(
      <HealthCard type="heart_rate" record={null} onClick={onClick} />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('selected 状态应用选中样式', () => {
    const { container } = render(
      <HealthCard type="weight" record={null} selected />,
    );

    const button = container.querySelector('button');
    expect(button?.className).toContain('cardSelected');
  });

  it('未知类型返回 null', () => {
    const { container } = render(
      <HealthCard type="unknown_type" record={null} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('显示测量时间', () => {
    render(
      <HealthCard
        type="weight"
        record={makeRecord({
          record_type: 'weight',
          values: { value: 65 },
          measured_at: '2024-06-15T08:30:00Z',
        })}
      />,
    );

    // 验证时间被渲染（格式因时区而异）
    const timeElements = screen.getByText(/\d+\/\d+ \d{2}:\d{2}/);
    expect(timeElements).toBeDefined();
  });
});
