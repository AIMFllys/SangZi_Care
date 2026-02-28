'use client';

// ============================================================
// 桑梓智护 — 用药计划表单组件
// 家属端创建/编辑老人用药计划，适老化大字体表单设计
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMedicineStore } from '@/stores/medicineStore';
import { useUserStore } from '@/stores/userStore';
import type {
  MedicationPlanResponse,
  MedicationPlanCreate,
  MedicationPlanUpdate,
} from '@/stores/medicineStore';
import styles from './PlanForm.module.css';

// ---------- 常量 ----------

const WEEK_DAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
] as const;

// ---------- 时间格式校验 ----------

/** 校验 HH:MM 格式 */
export function isValidTime(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// ---------- 表单校验 ----------

export interface FormErrors {
  medicine_name?: string;
  dosage?: string;
  schedule_times?: string;
  start_date?: string;
}

export interface PlanFormData {
  medicine_name: string;
  dosage: string;
  schedule_times: string[];
  start_date: string;
  end_date: string;
  repeat_days: number[];
  notes: string;
}

/** 校验表单数据，返回错误对象（空对象表示无错误） */
export function validateForm(data: PlanFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.medicine_name.trim()) {
    errors.medicine_name = '请输入药品名称';
  }
  if (!data.dosage.trim()) {
    errors.dosage = '请输入剂量';
  }
  if (data.schedule_times.length === 0) {
    errors.schedule_times = '请至少添加一个服药时间';
  }
  if (!data.start_date) {
    errors.start_date = '请选择开始日期';
  }

  return errors;
}

// ---------- Props ----------

export interface PlanFormProps {
  /** 老人用户ID */
  elderId: string;
  /** 编辑模式时传入已有计划 */
  plan?: MedicationPlanResponse;
  /** 提交成功回调 */
  onSuccess: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

// ---------- 组件实现 ----------

export function PlanForm({ elderId, plan, onSuccess, onCancel }: PlanFormProps) {
  const createPlan = useMedicineStore((s) => s.createPlan);
  const updatePlan = useMedicineStore((s) => s.updatePlan);
  const currentUser = useUserStore((s) => s.user);

  const isEdit = !!plan;

  // 表单状态
  const [formData, setFormData] = useState<PlanFormData>(() => ({
    medicine_name: plan?.medicine_name ?? '',
    dosage: plan?.dosage ?? '',
    schedule_times: plan?.schedule_times ?? [],
    start_date: plan?.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: plan?.end_date ?? '',
    repeat_days: plan?.repeat_days ?? [],
    notes: plan?.notes ?? '',
  }));

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新增时间输入
  const [newTime, setNewTime] = useState('');
  const formBodyRef = useRef<HTMLDivElement>(null);

  // 打开时聚焦到表单
  const firstInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // ------ 字段更新 ------

  const updateField = useCallback(
    <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      // 清除该字段的错误
      setErrors((prev) => {
        if (key in prev) {
          const next = { ...prev };
          delete next[key as keyof FormErrors];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  // ------ 时间管理 ------

  const addTime = useCallback(() => {
    const trimmed = newTime.trim();
    if (!isValidTime(trimmed)) return;
    if (formData.schedule_times.includes(trimmed)) return;

    const updated = [...formData.schedule_times, trimmed].sort();
    updateField('schedule_times', updated);
    setNewTime('');
  }, [newTime, formData.schedule_times, updateField]);

  const removeTime = useCallback(
    (time: string) => {
      updateField(
        'schedule_times',
        formData.schedule_times.filter((t) => t !== time),
      );
    },
    [formData.schedule_times, updateField],
  );

  // ------ 重复日期 ------

  const toggleDay = useCallback(
    (day: number) => {
      const current = formData.repeat_days;
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b);
      updateField('repeat_days', updated);
    },
    [formData.repeat_days, updateField],
  );

  // ------ 提交 ------

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isEdit && plan) {
        const updateData: MedicationPlanUpdate = {
          medicine_name: formData.medicine_name.trim(),
          dosage: formData.dosage.trim(),
          schedule_times: formData.schedule_times,
          start_date: formData.start_date,
          end_date: formData.end_date || undefined,
          repeat_days:
            formData.repeat_days.length > 0 ? formData.repeat_days : undefined,
          notes: formData.notes.trim() || undefined,
        };
        await updatePlan(plan.id, updateData);
      } else {
        const createData: MedicationPlanCreate = {
          user_id: elderId,
          medicine_name: formData.medicine_name.trim(),
          dosage: formData.dosage.trim(),
          schedule_times: formData.schedule_times,
          start_date: formData.start_date,
          end_date: formData.end_date || undefined,
          repeat_days:
            formData.repeat_days.length > 0 ? formData.repeat_days : undefined,
          notes: formData.notes.trim() || undefined,
          created_by: currentUser?.id,
          is_active: true,
        };
        await createPlan(createData);
      }
      onSuccess();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : '操作失败，请重试',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEdit, plan, elderId, currentUser, createPlan, updatePlan, onSuccess]);

  // ------ 阻止遮罩层点击穿透 ------

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel],
  );

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? '编辑用药计划' : '添加用药计划'}
      onClick={handleOverlayClick}
    >
      <div className={styles.formContainer}>
        {/* 头部 */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            {isEdit ? '✏️ 编辑用药计划' : '➕ 添加用药计划'}
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 表单主体 */}
        <div className={styles.formBody} ref={formBodyRef}>
          {/* 药品名称 */}
          <div className={styles.field}>
            <label className={styles.label}>
              药品名称<span className={styles.required}>*</span>
            </label>
            <input
              ref={firstInputRef}
              className={`${styles.input} ${errors.medicine_name ? styles.inputError : ''}`}
              type="text"
              placeholder="如：阿司匹林"
              value={formData.medicine_name}
              onChange={(e) => updateField('medicine_name', e.target.value)}
            />
            {errors.medicine_name && (
              <span className={styles.errorText}>{errors.medicine_name}</span>
            )}
          </div>

          {/* 剂量 */}
          <div className={styles.field}>
            <label className={styles.label}>
              剂量<span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.dosage ? styles.inputError : ''}`}
              type="text"
              placeholder="如：100mg 每次1片"
              value={formData.dosage}
              onChange={(e) => updateField('dosage', e.target.value)}
            />
            {errors.dosage && (
              <span className={styles.errorText}>{errors.dosage}</span>
            )}
          </div>

          {/* 服药时间 */}
          <div className={styles.field}>
            <label className={styles.label}>
              服药时间<span className={styles.required}>*</span>
            </label>
            <div className={styles.timeSlots}>
              {formData.schedule_times.map((time) => (
                <span key={time} className={styles.timeSlot}>
                  🕐 {time}
                  <button
                    className={styles.removeTimeBtn}
                    onClick={() => removeTime(time)}
                    aria-label={`移除时间 ${time}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className={styles.addTimeRow}>
              <input
                className={styles.timeInput}
                type="text"
                placeholder="HH:MM"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTime();
                  }
                }}
                maxLength={5}
              />
              <button
                className={styles.addTimeBtn}
                onClick={addTime}
                type="button"
              >
                添加时间
              </button>
            </div>
            {errors.schedule_times && (
              <span className={styles.errorText}>{errors.schedule_times}</span>
            )}
          </div>

          {/* 开始日期 */}
          <div className={styles.field}>
            <label className={styles.label}>
              开始日期<span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.start_date ? styles.inputError : ''}`}
              type="date"
              value={formData.start_date}
              onChange={(e) => updateField('start_date', e.target.value)}
            />
            {errors.start_date && (
              <span className={styles.errorText}>{errors.start_date}</span>
            )}
          </div>

          {/* 结束日期（可选） */}
          <div className={styles.field}>
            <label className={styles.label}>结束日期</label>
            <input
              className={styles.input}
              type="date"
              value={formData.end_date}
              onChange={(e) => updateField('end_date', e.target.value)}
            />
          </div>

          {/* 重复日期 */}
          <div className={styles.field}>
            <label className={styles.label}>重复日期</label>
            <div className={styles.weekDays}>
              {WEEK_DAYS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.dayCheckbox} ${formData.repeat_days.includes(value) ? styles.dayChecked : ''}`}
                  onClick={() => toggleDay(value)}
                  aria-pressed={formData.repeat_days.includes(value)}
                  aria-label={label}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div className={styles.field}>
            <label className={styles.label}>备注</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              placeholder="如：饭后服用、注意事项等"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>

          {/* 提交错误 */}
          {submitError && (
            <div className={styles.formError}>{submitError}</div>
          )}
        </div>

        {/* 底部操作 */}
        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            type="button"
          >
            取消
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isSubmitting}
            type="button"
          >
            {isSubmitting
              ? '提交中...'
              : isEdit
                ? '保存修改'
                : '创建计划'}
          </button>
        </div>
      </div>
    </div>
  );
}
