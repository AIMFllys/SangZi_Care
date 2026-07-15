import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getShanghaiNaturalDate,
  isValidTime,
  validateForm,
} from '../PlanForm';
import type { PlanFormData } from '../PlanForm';

// ---------- 纯函数测试 ----------

describe('isValidTime', () => {
  it('有效时间返回 true', () => {
    expect(isValidTime('08:00')).toBe(true);
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('12:30')).toBe(true);
  });

  it('无效格式返回 false', () => {
    expect(isValidTime('8:00')).toBe(false);
    expect(isValidTime('08:0')).toBe(false);
    expect(isValidTime('abc')).toBe(false);
    expect(isValidTime('')).toBe(false);
    expect(isValidTime('08-00')).toBe(false);
  });

  it('超出范围返回 false', () => {
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('23:60')).toBe(false);
    expect(isValidTime('99:99')).toBe(false);
  });
});

describe('validateForm', () => {
  const validData: PlanFormData = {
    medicine_name: '阿司匹林',
    dosage: '100mg',
    schedule_times: ['08:00'],
    start_date: '2024-06-15',
    end_date: '',
    repeat_days: [],
    notes: '',
    side_effects: '',
    is_active: true,
    remind_enabled: true,
    remind_before_minutes: 10,
  };

  it('有效数据返回空错误对象', () => {
    expect(validateForm(validData)).toEqual({});
  });

  it('药品名称为空时返回错误', () => {
    const errors = validateForm({ ...validData, medicine_name: '' });
    expect(errors.medicine_name).toBe('请输入药品名称');
  });

  it('药品名称仅空格时返回错误', () => {
    const errors = validateForm({ ...validData, medicine_name: '   ' });
    expect(errors.medicine_name).toBe('请输入药品名称');
  });

  it('剂量为空时返回错误', () => {
    const errors = validateForm({ ...validData, dosage: '' });
    expect(errors.dosage).toBe('请输入剂量');
  });

  it('服药时间为空数组时返回错误', () => {
    const errors = validateForm({ ...validData, schedule_times: [] });
    expect(errors.schedule_times).toBe('请至少添加一个服药时间');
  });

  it('开始日期为空时返回错误', () => {
    const errors = validateForm({ ...validData, start_date: '' });
    expect(errors.start_date).toBe('请选择开始日期');
  });

  it('结束日期早于开始日期时返回错误', () => {
    const errors = validateForm({
      ...validData,
      start_date: '2026-07-14',
      end_date: '2026-07-13',
    });
    expect(errors.end_date).toBe('结束日期不能早于开始日期');
  });

  it('提前提醒分钟数只接受 0 到 1440 的整数', () => {
    expect(validateForm({
      ...validData,
      remind_before_minutes: 1440,
    })).toEqual({});
    expect(validateForm({
      ...validData,
      remind_before_minutes: 1.5,
    }).remind_before_minutes).toBe('提前提醒时间须为 0 到 1440 的整数');
    expect(validateForm({
      ...validData,
      remind_before_minutes: 1441,
    }).remind_before_minutes).toBe('提前提醒时间须为 0 到 1440 的整数');
  });

  it('多个字段同时为空时返回多个错误', () => {
    const errors = validateForm({
      ...validData,
      medicine_name: '',
      dosage: '',
      schedule_times: [],
      start_date: '',
    });
    expect(Object.keys(errors)).toHaveLength(4);
  });
});

describe('getShanghaiNaturalDate', () => {
  it('在 UTC 与上海跨日时返回上海自然日', () => {
    expect(
      getShanghaiNaturalDate(new Date('2026-07-13T16:30:00.000Z')),
    ).toBe('2026-07-14');
  });
});

// ---------- 组件渲染测试 ----------

// Mock 依赖
const mockCreatePlan = vi.fn();
const mockUpdatePlan = vi.fn();
vi.mock('@/stores/medicineStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/medicineStore')>();
  return {
    ...actual,
    useMedicineStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        createPlan: mockCreatePlan,
        updatePlan: mockUpdatePlan,
      }),
  };
});

const mockUser = { id: 'family-user-1', role: 'family', name: '张三' };
vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: mockUser }),
}));

import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlanForm } from '../PlanForm';
import type { MedicationPlanResponse } from '@/stores/medicineStore';

function makePlan(overrides: Partial<MedicationPlanResponse> = {}): MedicationPlanResponse {
  return {
    id: 'plan-1',
    user_id: 'elder-1',
    medicine_name: '阿司匹林',
    dosage: '100mg',
    schedule_times: ['08:00', '20:00'],
    repeat_days: [1, 3, 5],
    start_date: '2024-06-01',
    end_date: null,
    is_active: true,
    created_by: 'family-user-1',
    unit: null,
    notes: '饭后服用',
    side_effects: null,
    remind_enabled: true,
    remind_before_minutes: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

describe('PlanForm 组件', () => {
  const defaultProps = {
    elderId: 'elder-1',
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染创建模式标题', () => {
    render(<PlanForm {...defaultProps} />);
    expect(screen.getByText(/添加用药计划/)).toBeDefined();
  });

  it('渲染编辑模式标题', () => {
    render(<PlanForm {...defaultProps} plan={makePlan()} />);
    expect(screen.getByText(/编辑用药计划/)).toBeDefined();
  });

  it('编辑模式预填充表单数据', () => {
    const plan = makePlan();
    render(<PlanForm {...defaultProps} plan={plan} />);

    const nameInput = screen.getByPlaceholderText('如：阿司匹林') as HTMLInputElement;
    expect(nameInput.value).toBe('阿司匹林');

    const dosageInput = screen.getByPlaceholderText('如：100mg 每次1片') as HTMLInputElement;
    expect(dosageInput.value).toBe('100mg');

    // 时间标签
    expect(screen.getByText(/08:00/)).toBeDefined();
    expect(screen.getByText(/20:00/)).toBeDefined();
  });

  it('具有正确的 ARIA 属性', () => {
    render(<PlanForm {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('添加用药计划');
  });

  it('必填字段为空时显示错误', async () => {
    render(<PlanForm {...defaultProps} />);

    // 清空默认的开始日期
    const dateInput = screen.getByDisplayValue(
      getShanghaiNaturalDate(),
    ) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '' } });

    const submitBtn = screen.getByText('创建计划');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(screen.getByText('请输入药品名称')).toBeDefined();
    expect(screen.getByText('请输入剂量')).toBeDefined();
    expect(screen.getByText('请至少添加一个服药时间')).toBeDefined();
    expect(screen.getByText('请选择开始日期')).toBeDefined();

    // 不应调用 API
    expect(mockCreatePlan).not.toHaveBeenCalled();
  });

  it('添加和移除服药时间', () => {
    render(<PlanForm {...defaultProps} />);

    const timeInput = screen.getByPlaceholderText('HH:MM') as HTMLInputElement;
    const addBtn = screen.getByText('添加时间');

    // 添加时间
    fireEvent.change(timeInput, { target: { value: '08:00' } });
    fireEvent.click(addBtn);

    expect(screen.getByText(/08:00/)).toBeDefined();

    // 移除时间
    const removeBtn = screen.getByLabelText('移除时间 08:00');
    fireEvent.click(removeBtn);

    expect(screen.queryByText(/🕐 08:00/)).toBeNull();
  });

  it('无效时间格式不添加', () => {
    render(<PlanForm {...defaultProps} />);

    const timeInput = screen.getByPlaceholderText('HH:MM') as HTMLInputElement;
    const addBtn = screen.getByText('添加时间');

    fireEvent.change(timeInput, { target: { value: 'abc' } });
    fireEvent.click(addBtn);

    // 不应有时间标签
    expect(screen.queryByLabelText(/移除时间/)).toBeNull();
  });

  it('重复日期切换', () => {
    render(<PlanForm {...defaultProps} />);

    const mondayBtn = screen.getByRole('button', { name: '周一' });
    expect(mondayBtn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(mondayBtn);
    expect(mondayBtn.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(mondayBtn);
    expect(mondayBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('创建模式提交成功调用 createPlan', async () => {
    mockCreatePlan.mockResolvedValue({ id: 'new-plan' });
    render(<PlanForm {...defaultProps} />);

    // 填写表单
    fireEvent.change(screen.getByPlaceholderText('如：阿司匹林'), {
      target: { value: '二甲双胍' },
    });
    fireEvent.change(screen.getByPlaceholderText('如：100mg 每次1片'), {
      target: { value: '500mg' },
    });

    // 添加时间
    const timeInput = screen.getByPlaceholderText('HH:MM');
    fireEvent.change(timeInput, { target: { value: '08:00' } });
    fireEvent.click(screen.getByText('添加时间'));

    fireEvent.change(screen.getByLabelText('提前提醒'), {
      target: { value: '30' },
    });

    // 提交
    await act(async () => {
      fireEvent.click(screen.getByText('创建计划'));
    });

    expect(mockCreatePlan).toHaveBeenCalledTimes(1);
    const callArg = mockCreatePlan.mock.calls[0][0];
    expect(callArg.user_id).toBe('elder-1');
    expect(callArg.medicine_name).toBe('二甲双胍');
    expect(callArg.dosage).toBe('500mg');
    expect(callArg.schedule_times).toEqual(['08:00']);
    expect(callArg.created_by).toBe('family-user-1');
    expect(callArg.is_active).toBe(true);
    expect(callArg.remind_enabled).toBe(true);
    expect(callArg.remind_before_minutes).toBe(30);

    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('编辑模式提交成功调用 updatePlan', async () => {
    const plan = makePlan();
    mockUpdatePlan.mockResolvedValue({ ...plan, dosage: '200mg' });
    render(<PlanForm {...defaultProps} plan={plan} />);

    // 修改剂量
    const dosageInput = screen.getByPlaceholderText('如：100mg 每次1片');
    fireEvent.change(dosageInput, { target: { value: '200mg' } });

    await act(async () => {
      fireEvent.click(screen.getByText('保存修改'));
    });

    expect(mockUpdatePlan).toHaveBeenCalledTimes(1);
    expect(mockUpdatePlan.mock.calls[0][0]).toBe('plan-1');
    expect(mockUpdatePlan.mock.calls[0][1].dosage).toBe('200mg');

    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('编辑时可明确清空可选字段、取消重复日期并停用提醒和计划', async () => {
    const plan = makePlan({
      end_date: '2024-12-31',
      repeat_days: [1],
      notes: '饭后服用',
      side_effects: '轻微头晕',
      remind_before_minutes: 15,
    });
    mockUpdatePlan.mockResolvedValue({
      ...plan,
      end_date: null,
      repeat_days: [],
      notes: null,
      side_effects: null,
      is_active: false,
      remind_enabled: false,
    });
    render(<PlanForm {...defaultProps} plan={plan} />);

    fireEvent.change(screen.getByDisplayValue('2024-12-31'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: '周一' }));
    fireEvent.change(screen.getByPlaceholderText('如：饭后服用、注意事项等'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByPlaceholderText('如：头晕、恶心；没有可留空'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('switch', { name: '启用定时用药提醒' }));
    fireEvent.click(screen.getByRole('switch', { name: '启用用药计划' }));

    await act(async () => {
      fireEvent.click(screen.getByText('保存修改'));
    });

    expect(mockUpdatePlan).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({
        end_date: null,
        repeat_days: [],
        notes: null,
        side_effects: null,
        is_active: false,
        remind_enabled: false,
        remind_before_minutes: 15,
      }),
    );
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('提交失败显示错误信息', async () => {
    mockCreatePlan.mockRejectedValue(new Error('服务器错误'));
    render(<PlanForm {...defaultProps} />);

    // 填写必填字段
    fireEvent.change(screen.getByPlaceholderText('如：阿司匹林'), {
      target: { value: '药品' },
    });
    fireEvent.change(screen.getByPlaceholderText('如：100mg 每次1片'), {
      target: { value: '1片' },
    });
    const timeInput = screen.getByPlaceholderText('HH:MM');
    fireEvent.change(timeInput, { target: { value: '08:00' } });
    fireEvent.click(screen.getByText('添加时间'));

    await act(async () => {
      fireEvent.click(screen.getByText('创建计划'));
    });

    expect(screen.getByText('服务器错误')).toBeDefined();
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it('点击取消调用 onCancel', () => {
    render(<PlanForm {...defaultProps} />);
    fireEvent.click(screen.getByText('取消'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('点击关闭按钮调用 onCancel', () => {
    render(<PlanForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('关闭'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
