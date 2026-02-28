import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractNumbersFromTranscript,
  parseVoiceForType,
  validateFormValues,
  buildRecordValues,
} from '../page';

// ============================================================
// 纯函数单元测试
// ============================================================

describe('extractNumbersFromTranscript', () => {
  it('提取阿拉伯数字', () => {
    expect(extractNumbersFromTranscript('血压135和88')).toEqual([135, 88]);
  });

  it('提取小数', () => {
    expect(extractNumbersFromTranscript('体温36.5度')).toEqual([36.5]);
  });

  it('处理中文数字"一百二十"', () => {
    const result = extractNumbersFromTranscript('血压一百二十八十');
    expect(result).toContain(120);
    expect(result).toContain(80);
  });

  it('空字符串返回空数组', () => {
    expect(extractNumbersFromTranscript('')).toEqual([]);
  });

  it('无数字返回空数组', () => {
    expect(extractNumbersFromTranscript('没有数字')).toEqual([]);
  });

  it('过滤掉0和负数', () => {
    const result = extractNumbersFromTranscript('0和135');
    expect(result).toEqual([135]);
  });
});

describe('parseVoiceForType', () => {
  it('血压：两个数字分配为收缩压和舒张压', () => {
    const result = parseVoiceForType('135和88', 'blood_pressure');
    expect(result.systolic).toBe('135');
    expect(result.diastolic).toBe('88');
  });

  it('血压：较大值为收缩压', () => {
    const result = parseVoiceForType('80和130', 'blood_pressure');
    expect(result.systolic).toBe('130');
    expect(result.diastolic).toBe('80');
  });

  it('血压：只有一个数字时设为收缩压', () => {
    const result = parseVoiceForType('135', 'blood_pressure');
    expect(result.systolic).toBe('135');
    expect(result.diastolic).toBeUndefined();
  });

  it('血糖：提取第一个数字', () => {
    const result = parseVoiceForType('5.6', 'blood_sugar');
    expect(result.bloodSugarValue).toBe('5.6');
  });

  it('心率：提取数字', () => {
    const result = parseVoiceForType('心率72', 'heart_rate');
    expect(result.heartRateValue).toBe('72');
  });

  it('体重：提取数字', () => {
    const result = parseVoiceForType('65公斤', 'weight');
    expect(result.weightValue).toBe('65');
  });

  it('体温：提取数字', () => {
    const result = parseVoiceForType('36.5度', 'temperature');
    expect(result.temperatureValue).toBe('36.5');
  });

  it('无数字返回空对象', () => {
    expect(parseVoiceForType('没有数字', 'heart_rate')).toEqual({});
  });
});

describe('validateFormValues', () => {
  const baseValues = {
    systolic: '120',
    diastolic: '80',
    bloodSugarValue: '5.6',
    sugarType: 'fasting' as const,
    heartRateValue: '72',
    weightValue: '65',
    temperatureValue: '36.5',
    notes: '',
    symptoms: '',
  };

  it('血压有效数据无错误', () => {
    expect(validateFormValues('blood_pressure', baseValues)).toEqual({});
  });

  it('血压收缩压为空时报错', () => {
    const errors = validateFormValues('blood_pressure', { ...baseValues, systolic: '' });
    expect(errors.systolic).toBeDefined();
  });

  it('血压舒张压为空时报错', () => {
    const errors = validateFormValues('blood_pressure', { ...baseValues, diastolic: '' });
    expect(errors.diastolic).toBeDefined();
  });

  it('血压非数字时报错', () => {
    const errors = validateFormValues('blood_pressure', { ...baseValues, systolic: 'abc' });
    expect(errors.systolic).toBeDefined();
  });

  it('血糖为空时报错', () => {
    const errors = validateFormValues('blood_sugar', { ...baseValues, bloodSugarValue: '' });
    expect(errors.bloodSugarValue).toBeDefined();
  });

  it('心率为空时报错', () => {
    const errors = validateFormValues('heart_rate', { ...baseValues, heartRateValue: '' });
    expect(errors.heartRateValue).toBeDefined();
  });

  it('体重为空时报错', () => {
    const errors = validateFormValues('weight', { ...baseValues, weightValue: '' });
    expect(errors.weightValue).toBeDefined();
  });

  it('体温为空时报错', () => {
    const errors = validateFormValues('temperature', { ...baseValues, temperatureValue: '' });
    expect(errors.temperatureValue).toBeDefined();
  });

  it('负数报错', () => {
    const errors = validateFormValues('heart_rate', { ...baseValues, heartRateValue: '-5' });
    expect(errors.heartRateValue).toBeDefined();
  });
});

describe('buildRecordValues', () => {
  const baseValues = {
    systolic: '135',
    diastolic: '88',
    bloodSugarValue: '5.6',
    sugarType: 'fasting' as const,
    heartRateValue: '72',
    weightValue: '65',
    temperatureValue: '36.5',
    notes: '',
    symptoms: '',
  };

  it('血压返回 systolic 和 diastolic', () => {
    const result = buildRecordValues('blood_pressure', baseValues);
    expect(result).toEqual({ systolic: 135, diastolic: 88 });
  });

  it('血糖返回 value 和 measurement_type', () => {
    const result = buildRecordValues('blood_sugar', baseValues);
    expect(result).toEqual({ value: 5.6, measurement_type: 'fasting' });
  });

  it('心率返回 value', () => {
    const result = buildRecordValues('heart_rate', baseValues);
    expect(result).toEqual({ value: 72 });
  });

  it('体重返回 value', () => {
    const result = buildRecordValues('weight', baseValues);
    expect(result).toEqual({ value: 65 });
  });

  it('体温返回 value', () => {
    const result = buildRecordValues('temperature', baseValues);
    expect(result).toEqual({ value: 36.5 });
  });
});

// ============================================================
// 组件渲染测试
// ============================================================

// Mock 依赖
const mockCreateRecord = vi.fn();
vi.mock('@/stores/healthStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/healthStore')>();
  return {
    ...actual,
    useHealthStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ createRecord: mockCreateRecord }),
  };
});

const mockUser = { id: 'user-1', role: 'elder', name: '李奶奶' };
vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: mockUser }),
}));

const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
const mockResetTranscript = vi.fn();
let mockIsListening = false;
let mockTranscript = '';

vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    isListening: mockIsListening,
    transcript: mockTranscript,
    startListening: mockStartListening,
    stopListening: mockStopListening,
    resetTranscript: mockResetTranscript,
    error: null,
    currentLevel: 'web',
  }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { render, screen, fireEvent, act } from '@testing-library/react';

// 动态导入组件（在 mock 之后）
const { default: HealthInputPage } = await import('../page');

describe('HealthInputPage 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsListening = false;
    mockTranscript = '';
  });

  it('渲染页面标题', () => {
    render(<HealthInputPage />);
    expect(screen.getByText(/录入健康数据/)).toBeDefined();
  });

  it('渲染5个记录类型选择按钮', () => {
    render(<HealthInputPage />);
    expect(screen.getByText('血压')).toBeDefined();
    expect(screen.getByText('血糖')).toBeDefined();
    expect(screen.getByText('心率')).toBeDefined();
    expect(screen.getByText('体重')).toBeDefined();
    expect(screen.getByText('体温')).toBeDefined();
  });

  it('默认选中血压类型', () => {
    render(<HealthInputPage />);
    const bpBtn = screen.getByRole('button', { name: '血压' });
    expect(bpBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('渲染手动录入和语音录入切换', () => {
    render(<HealthInputPage />);
    expect(screen.getByText(/手动录入/)).toBeDefined();
    expect(screen.getByText(/语音录入/)).toBeDefined();
  });

  it('血压类型显示收缩压和舒张压输入', () => {
    render(<HealthInputPage />);
    expect(screen.getByLabelText('收缩压')).toBeDefined();
    expect(screen.getByLabelText('舒张压')).toBeDefined();
  });

  it('切换到心率类型显示心率输入', () => {
    render(<HealthInputPage />);
    fireEvent.click(screen.getByRole('button', { name: '心率' }));
    expect(screen.getByLabelText('心率值')).toBeDefined();
  });

  it('切换到血糖类型显示空腹/餐后切换', () => {
    render(<HealthInputPage />);
    fireEvent.click(screen.getByRole('button', { name: '血糖' }));
    expect(screen.getByText('空腹')).toBeDefined();
    expect(screen.getByText('餐后')).toBeDefined();
  });

  it('切换到体重类型显示体重输入', () => {
    render(<HealthInputPage />);
    fireEvent.click(screen.getByRole('button', { name: '体重' }));
    expect(screen.getByLabelText('体重值')).toBeDefined();
  });

  it('切换到体温类型显示体温输入', () => {
    render(<HealthInputPage />);
    fireEvent.click(screen.getByRole('button', { name: '体温' }));
    expect(screen.getByLabelText('体温值')).toBeDefined();
  });

  it('空字段提交显示错误', async () => {
    render(<HealthInputPage />);

    await act(async () => {
      fireEvent.click(screen.getByText(/保存记录/));
    });

    expect(screen.getByText('请输入有效的收缩压')).toBeDefined();
    expect(screen.getByText('请输入有效的舒张压')).toBeDefined();
    expect(mockCreateRecord).not.toHaveBeenCalled();
  });

  it('有效血压数据提交成功', async () => {
    mockCreateRecord.mockResolvedValue({ id: 'record-1' });
    render(<HealthInputPage />);

    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('舒张压'), { target: { value: '80' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/保存记录/));
    });

    expect(mockCreateRecord).toHaveBeenCalledTimes(1);
    const callArg = mockCreateRecord.mock.calls[0][0];
    expect(callArg.record_type).toBe('blood_pressure');
    expect(callArg.values.systolic).toBe(120);
    expect(callArg.values.diastolic).toBe(80);
    expect(callArg.input_method).toBe('manual');
    expect(callArg.recorded_by).toBe('user-1');
  });

  it('语音录入切换显示麦克风按钮', () => {
    render(<HealthInputPage />);
    fireEvent.click(screen.getByText(/语音录入/));
    expect(screen.getByLabelText('开始录音')).toBeDefined();
  });

  it('点击麦克风按钮调用 startListening', async () => {
    render(<HealthInputPage />);
    fireEvent.click(screen.getByText(/语音录入/));

    await act(async () => {
      fireEvent.click(screen.getByLabelText('开始录音'));
    });

    expect(mockResetTranscript).toHaveBeenCalled();
    expect(mockStartListening).toHaveBeenCalled();
  });

  it('返回按钮导航到健康记录页', () => {
    render(<HealthInputPage />);
    fireEvent.click(screen.getByLabelText('返回健康记录'));
    expect(mockPush).toHaveBeenCalledWith('/health');
  });

  it('渲染备注和症状文本框', () => {
    render(<HealthInputPage />);
    expect(screen.getByPlaceholderText(/添加备注信息/)).toBeDefined();
    expect(screen.getByPlaceholderText(/描述当前症状/)).toBeDefined();
  });

  it('提交成功显示成功提示', async () => {
    mockCreateRecord.mockResolvedValue({ id: 'record-1' });
    render(<HealthInputPage />);

    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('舒张压'), { target: { value: '80' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/保存记录/));
    });

    expect(screen.getByText('记录保存成功！')).toBeDefined();
  });
});
