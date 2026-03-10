'use client';

// ============================================================
// 桑梓智护 — 健康数据录入页
// 支持手动录入和语音录入，适老化超大数字输入设计
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthStore, RECORD_TYPE_CONFIG, RECORD_TYPES } from '@/stores/healthStore';
import type { HealthRecordCreate } from '@/stores/healthStore';
import { useUserStore } from '@/stores/userStore';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { ROUTES } from '@/lib/constants';
import { ArrowLeft, Mic, Square, Edit3, FileEdit, CheckCircle, Activity, Droplet, Heart, Scale, Thermometer } from 'lucide-react';
import styles from './page.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  blood_pressure: <Droplet size={24} />,
  blood_sugar: <Activity size={24} />,
  heart_rate: <Heart size={24} />,
  weight: <Scale size={24} />,
  temperature: <Thermometer size={24} />,
};

// ---------- 类型 ----------

type RecordType = 'blood_pressure' | 'blood_sugar' | 'heart_rate' | 'weight' | 'temperature';
type InputMethod = 'manual' | 'voice';
type SugarMeasurementType = 'fasting' | 'postprandial';

interface FormValues {
  // 血压
  systolic: string;
  diastolic: string;
  // 血糖
  bloodSugarValue: string;
  sugarType: SugarMeasurementType;
  // 心率
  heartRateValue: string;
  // 体重
  weightValue: string;
  // 体温
  temperatureValue: string;
  // 可选
  notes: string;
  symptoms: string;
}

interface FormErrors {
  systolic?: string;
  diastolic?: string;
  bloodSugarValue?: string;
  heartRateValue?: string;
  weightValue?: string;
  temperatureValue?: string;
}

// ---------- 语音解析工具 ----------

/** 从中文语音文本中提取数字 */
export function extractNumbersFromTranscript(text: string): number[] {
  if (!text) return [];

  // 中文数字映射
  const cnMap: Record<string, string> = {
    '零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
    '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
    '十': '10', '百': '00', '千': '000',
  };

  // 先替换中文数字为阿拉伯数字
  let normalized = text;

  // 处理"一百二十"这类中文数字表达
  // 先处理完整的"X百Y十Z"模式
  normalized = normalized
    .replace(/一百二十/g, '120 ')
    .replace(/一百三十/g, '130 ')
    .replace(/一百四十/g, '140 ')
    .replace(/一百五十/g, '150 ')
    .replace(/一百六十/g, '160 ')
    .replace(/一百七十/g, '170 ')
    .replace(/一百八十/g, '180 ')
    .replace(/一百九十/g, '190 ')
    .replace(/一百/g, '100 ')
    .replace(/二百/g, '200 ')
    .replace(/八十/g, '80 ')
    .replace(/七十/g, '70 ')
    .replace(/六十/g, '60 ')
    .replace(/九十/g, '90 ')
    .replace(/五十/g, '50 ')
    .replace(/四十/g, '40 ')
    .replace(/三十/g, '30 ');

  // 替换剩余的单个中文数字
  for (const [cn, num] of Object.entries(cnMap)) {
    normalized = normalized.replace(new RegExp(cn, 'g'), num);
  }

  // 提取所有数字（包括小数）
  const matches = normalized.match(/\d+\.?\d*/g);
  if (!matches) return [];

  return matches.map(Number).filter((n) => !isNaN(n) && n > 0);
}

/** 根据记录类型从语音文本解析数值 */
export function parseVoiceForType(
  text: string,
  recordType: RecordType,
): Partial<FormValues> {
  const numbers = extractNumbersFromTranscript(text);
  if (numbers.length === 0) return {};

  switch (recordType) {
    case 'blood_pressure': {
      // 血压需要两个数字：收缩压和舒张压
      if (numbers.length >= 2) {
        // 较大的是收缩压，较小的是舒张压
        const sorted = [...numbers].sort((a, b) => b - a);
        return {
          systolic: String(sorted[0]),
          diastolic: String(sorted[1]),
        };
      }
      if (numbers.length === 1) {
        return { systolic: String(numbers[0]) };
      }
      return {};
    }
    case 'blood_sugar':
      return { bloodSugarValue: String(numbers[0]) };
    case 'heart_rate':
      return { heartRateValue: String(numbers[0]) };
    case 'weight':
      return { weightValue: String(numbers[0]) };
    case 'temperature':
      return { temperatureValue: String(numbers[0]) };
    default:
      return {};
  }
}

// ---------- 表单校验 ----------

/** 校验数值是否为正数 */
function isPositiveNumber(value: string): boolean {
  if (!value.trim()) return false;
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

/** 校验表单，返回错误对象 */
export function validateFormValues(
  recordType: RecordType,
  values: FormValues,
): FormErrors {
  const errors: FormErrors = {};

  switch (recordType) {
    case 'blood_pressure':
      if (!isPositiveNumber(values.systolic)) {
        errors.systolic = '请输入有效的收缩压';
      }
      if (!isPositiveNumber(values.diastolic)) {
        errors.diastolic = '请输入有效的舒张压';
      }
      break;
    case 'blood_sugar':
      if (!isPositiveNumber(values.bloodSugarValue)) {
        errors.bloodSugarValue = '请输入有效的血糖值';
      }
      break;
    case 'heart_rate':
      if (!isPositiveNumber(values.heartRateValue)) {
        errors.heartRateValue = '请输入有效的心率值';
      }
      break;
    case 'weight':
      if (!isPositiveNumber(values.weightValue)) {
        errors.weightValue = '请输入有效的体重值';
      }
      break;
    case 'temperature':
      if (!isPositiveNumber(values.temperatureValue)) {
        errors.temperatureValue = '请输入有效的体温值';
      }
      break;
  }

  return errors;
}

/** 构建提交数据的 values 对象 */
export function buildRecordValues(
  recordType: RecordType,
  formValues: FormValues,
): Record<string, any> {
  switch (recordType) {
    case 'blood_pressure':
      return {
        systolic: Number(formValues.systolic),
        diastolic: Number(formValues.diastolic),
      };
    case 'blood_sugar':
      return {
        value: Number(formValues.bloodSugarValue),
        measurement_type: formValues.sugarType,
      };
    case 'heart_rate':
      return { value: Number(formValues.heartRateValue) };
    case 'weight':
      return { value: Number(formValues.weightValue) };
    case 'temperature':
      return { value: Number(formValues.temperatureValue) };
    default:
      return {};
  }
}

// ---------- 初始表单值 ----------

const INITIAL_FORM_VALUES: FormValues = {
  systolic: '',
  diastolic: '',
  bloodSugarValue: '',
  sugarType: 'fasting',
  heartRateValue: '',
  weightValue: '',
  temperatureValue: '',
  notes: '',
  symptoms: '',
};

// ---------- 组件 ----------

export default function HealthInputPage() {
  const router = useRouter();
  const createRecord = useHealthStore((s) => s.createRecord);
  const currentUser = useUserStore((s) => s.user);
  const { isListening, transcript, startListening, stopListening, resetTranscript } =
    useVoiceRecognition();

  // 状态
  const [selectedType, setSelectedType] = useState<RecordType>('blood_pressure');
  const [inputMethod, setInputMethod] = useState<InputMethod>('manual');
  const [formValues, setFormValues] = useState<FormValues>(INITIAL_FORM_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 上一次处理过的 transcript 长度，避免重复解析
  const lastTranscriptRef = useRef('');

  // ------ 语音文本变化时自动解析 ------

  useEffect(() => {
    if (!transcript || transcript === lastTranscriptRef.current) return;
    lastTranscriptRef.current = transcript;

    const parsed = parseVoiceForType(transcript, selectedType);
    if (Object.keys(parsed).length > 0) {
      setFormValues((prev) => ({ ...prev, ...parsed }));
      // 清除已解析字段的错误
      setErrors((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(parsed)) {
          delete next[key as keyof FormErrors];
        }
        return next;
      });
    }
  }, [transcript, selectedType]);

  // ------ 字段更新 ------

  const updateField = useCallback(
    <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
      setFormValues((prev) => ({ ...prev, [key]: value }));
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

  // ------ 切换记录类型 ------

  const handleTypeChange = useCallback((type: RecordType) => {
    setSelectedType(type);
    setErrors({});
  }, []);

  // ------ 切换录入方式 ------

  const handleMethodChange = useCallback(
    (method: InputMethod) => {
      setInputMethod(method);
      if (method === 'manual' && isListening) {
        stopListening();
      }
    },
    [isListening, stopListening],
  );

  // ------ 语音按钮 ------

  const handleMicToggle = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      lastTranscriptRef.current = '';
      await startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  // ------ 提交 ------

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateFormValues(selectedType, formValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const recordData: HealthRecordCreate = {
        record_type: selectedType,
        values: buildRecordValues(selectedType, formValues),
        measured_at: new Date().toISOString(),
        input_method: inputMethod,
        recorded_by: currentUser?.id,
        notes: formValues.notes.trim() || undefined,
        symptoms: formValues.symptoms.trim() || undefined,
      };

      await createRecord(recordData);
      setShowSuccess(true);

      // 1.5秒后跳转回健康记录页
      setTimeout(() => {
        router.push(ROUTES.HEALTH);
      }, 1500);
    } catch {
      setErrors({ systolic: '保存失败，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedType, formValues, inputMethod, currentUser, createRecord, router]);

  // ------ 渲染表单字段 ------

  const renderFormFields = () => {
    const config = RECORD_TYPE_CONFIG[selectedType];

    switch (selectedType) {
      case 'blood_pressure':
        return (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>收缩压（高压）</label>
              <div className={styles.fieldRow}>
                <input
                  className={`${styles.numberInput} ${errors.systolic ? styles.inputError : ''}`}
                  type="number"
                  inputMode="numeric"
                  placeholder="120"
                  value={formValues.systolic}
                  onChange={(e) => updateField('systolic', e.target.value)}
                  aria-label="收缩压"
                />
                <span className={styles.fieldUnit}>mmHg</span>
              </div>
              {errors.systolic && <span className={styles.errorText}>{errors.systolic}</span>}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>舒张压（低压）</label>
              <div className={styles.fieldRow}>
                <input
                  className={`${styles.numberInput} ${errors.diastolic ? styles.inputError : ''}`}
                  type="number"
                  inputMode="numeric"
                  placeholder="80"
                  value={formValues.diastolic}
                  onChange={(e) => updateField('diastolic', e.target.value)}
                  aria-label="舒张压"
                />
                <span className={styles.fieldUnit}>mmHg</span>
              </div>
              {errors.diastolic && <span className={styles.errorText}>{errors.diastolic}</span>}
            </div>
          </>
        );

      case 'blood_sugar':
        return (
          <>
            <div className={styles.fieldGroup}>
              <div className={styles.sugarToggle}>
                <button
                  type="button"
                  className={`${styles.sugarBtn} ${formValues.sugarType === 'fasting' ? styles.sugarBtnActive : ''}`}
                  onClick={() => updateField('sugarType', 'fasting')}
                >
                  空腹
                </button>
                <button
                  type="button"
                  className={`${styles.sugarBtn} ${formValues.sugarType === 'postprandial' ? styles.sugarBtnActive : ''}`}
                  onClick={() => updateField('sugarType', 'postprandial')}
                >
                  餐后
                </button>
              </div>
              <div className={styles.fieldRow}>
                <input
                  className={`${styles.numberInput} ${errors.bloodSugarValue ? styles.inputError : ''}`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="5.6"
                  value={formValues.bloodSugarValue}
                  onChange={(e) => updateField('bloodSugarValue', e.target.value)}
                  aria-label="血糖值"
                />
                <span className={styles.fieldUnit}>{config?.unit}</span>
              </div>
              {errors.bloodSugarValue && (
                <span className={styles.errorText}>{errors.bloodSugarValue}</span>
              )}
            </div>
          </>
        );

      case 'heart_rate':
        return (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>心率</label>
            <div className={styles.fieldRow}>
              <input
                className={`${styles.numberInput} ${errors.heartRateValue ? styles.inputError : ''}`}
                type="number"
                inputMode="numeric"
                placeholder="72"
                value={formValues.heartRateValue}
                onChange={(e) => updateField('heartRateValue', e.target.value)}
                aria-label="心率值"
              />
              <span className={styles.fieldUnit}>{config?.unit}</span>
            </div>
            {errors.heartRateValue && (
              <span className={styles.errorText}>{errors.heartRateValue}</span>
            )}
          </div>
        );

      case 'weight':
        return (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>体重</label>
            <div className={styles.fieldRow}>
              <input
                className={`${styles.numberInput} ${errors.weightValue ? styles.inputError : ''}`}
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="65.0"
                value={formValues.weightValue}
                onChange={(e) => updateField('weightValue', e.target.value)}
                aria-label="体重值"
              />
              <span className={styles.fieldUnit}>{config?.unit}</span>
            </div>
            {errors.weightValue && (
              <span className={styles.errorText}>{errors.weightValue}</span>
            )}
          </div>
        );

      case 'temperature':
        return (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>体温</label>
            <div className={styles.fieldRow}>
              <input
                className={`${styles.numberInput} ${errors.temperatureValue ? styles.inputError : ''}`}
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="36.5"
                value={formValues.temperatureValue}
                onChange={(e) => updateField('temperatureValue', e.target.value)}
                aria-label="体温值"
              />
              <span className={styles.fieldUnit}>{config?.unit}</span>
            </div>
            {errors.temperatureValue && (
              <span className={styles.errorText}>{errors.temperatureValue}</span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(ROUTES.HEALTH)}
          aria-label="返回健康记录"
          type="button"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileEdit size={24} /> 录入健康数据</h1>
      </header>

      {/* 记录类型选择 */}
      <section className={styles.typeSection} aria-label="选择记录类型">
        <div className={styles.typeGrid}>
          {RECORD_TYPES.map((type) => {
            const config = RECORD_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                type="button"
                className={`${styles.typeCard} ${selectedType === type ? styles.typeCardSelected : ''}`}
                onClick={() => handleTypeChange(type as RecordType)}
                aria-pressed={selectedType === type}
                aria-label={config.label}
              >
                <div className={styles.typeIcon} style={{ marginBottom: 8 }}>{ICON_MAP[type]}</div>
                <span className={styles.typeLabel}>{config.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 录入方式切换 */}
      <div className={styles.methodToggle} role="tablist" aria-label="录入方式">
        <button
          type="button"
          role="tab"
          className={`${styles.methodTab} ${inputMethod === 'manual' ? styles.methodTabActive : ''}`}
          onClick={() => handleMethodChange('manual')}
          aria-selected={inputMethod === 'manual'}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
        >
          <Edit3 size={18} /> 手动录入
        </button>
        <button
          type="button"
          role="tab"
          className={`${styles.methodTab} ${inputMethod === 'voice' ? styles.methodTabActive : ''}`}
          onClick={() => handleMethodChange('voice')}
          aria-selected={inputMethod === 'voice'}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
        >
          <Mic size={18} /> 语音录入
        </button>
      </div>

      {/* 表单区域 */}
      <div className={styles.formSection}>
        {/* 语音录入区域 */}
        {inputMethod === 'voice' && (
          <div className={styles.voiceSection}>
            <button
              type="button"
              className={`${styles.micBtn} ${isListening ? styles.micBtnListening : ''}`}
              onClick={handleMicToggle}
              aria-label={isListening ? '停止录音' : '开始录音'}
            >
              {isListening ? <Square size={32} /> : <Mic size={32} />}
            </button>
            <span className={styles.voiceHint}>
              {isListening ? '正在聆听，请说出数值...' : '点击麦克风开始语音录入'}
            </span>
            {transcript && (
              <div className={styles.voiceTranscript} aria-live="polite">
                {transcript}
              </div>
            )}
          </div>
        )}

        {/* 数值输入字段 */}
        {renderFormFields()}
      </div>

      {/* 可选字段 */}
      <div className={styles.optionalSection}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>备注</label>
          <textarea
            className={styles.textarea}
            placeholder="添加备注信息（可选）"
            value={formValues.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>症状</label>
          <textarea
            className={styles.textarea}
            placeholder="描述当前症状（可选）"
            value={formValues.symptoms}
            onChange={(e) => updateField('symptoms', e.target.value)}
          />
        </div>
      </div>

      {/* 提交按钮 */}
      <div className={styles.submitSection}>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
        >
          {isSubmitting ? '保存中...' : <><CheckCircle size={20} /> 保存记录</>}
        </button>
      </div>

      {/* 成功提示 */}
      {showSuccess && (
        <div className={styles.successOverlay} role="alert">
          <div className={styles.successCard}>
            <span className={styles.successIcon}><CheckCircle size={48} color="var(--color-success)" /></span>
            <span className={styles.successText}>记录保存成功！</span>
          </div>
        </div>
      )}
    </div>
  );
}
