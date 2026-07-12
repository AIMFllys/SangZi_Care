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
import { Mic, Square, Edit3, FileEdit, CheckCircle, Activity, Droplet, Heart, Scale, Thermometer } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
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

  // ------ 取消 ------

  const handleCancel = useCallback(() => {
    router.push(ROUTES.HEALTH);
  }, [router]);

  // ------ 渲染表单字段 ------

  const renderFormFields = () => {
    const config = RECORD_TYPE_CONFIG[selectedType];

    switch (selectedType) {
      case 'blood_pressure':
        return (
          <>
            <Input
              label="收缩压（高压）"
              value={formValues.systolic}
              onChange={(value) => updateField('systolic', value)}
              type="number"
              inputMode="numeric"
              placeholder="120"
              error={errors.systolic}
              suffix="mmHg"
              aria-label="收缩压"
            />
            <Input
              label="舒张压（低压）"
              value={formValues.diastolic}
              onChange={(value) => updateField('diastolic', value)}
              type="number"
              inputMode="numeric"
              placeholder="80"
              error={errors.diastolic}
              suffix="mmHg"
              aria-label="舒张压"
            />
          </>
        );

      case 'blood_sugar':
        return (
          <>
            <div className={styles.sugarToggle} role="group" aria-label="血糖测量类型">
              <Button
                type="button"
                variant={formValues.sugarType === 'fasting' ? 'primary' : 'secondary'}
                size="lg"
                fullWidth
                onClick={() => updateField('sugarType', 'fasting')}
              >
                空腹
              </Button>
              <Button
                type="button"
                variant={formValues.sugarType === 'postprandial' ? 'primary' : 'secondary'}
                size="lg"
                fullWidth
                onClick={() => updateField('sugarType', 'postprandial')}
              >
                餐后
              </Button>
            </div>
            <Input
              label="血糖值"
              value={formValues.bloodSugarValue}
              onChange={(value) => updateField('bloodSugarValue', value)}
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="5.6"
              error={errors.bloodSugarValue}
              suffix={config?.unit}
              aria-label="血糖值"
            />
          </>
        );

      case 'heart_rate':
        return (
          <Input
            label="心率"
            value={formValues.heartRateValue}
            onChange={(value) => updateField('heartRateValue', value)}
            type="number"
            inputMode="numeric"
            placeholder="72"
            error={errors.heartRateValue}
            suffix={config?.unit}
            aria-label="心率值"
          />
        );

      case 'weight':
        return (
          <Input
            label="体重"
            value={formValues.weightValue}
            onChange={(value) => updateField('weightValue', value)}
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="65.0"
            error={errors.weightValue}
            suffix={config?.unit}
            aria-label="体重值"
          />
        );

      case 'temperature':
        return (
          <Input
            label="体温"
            value={formValues.temperatureValue}
            onChange={(value) => updateField('temperatureValue', value)}
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="36.5"
            error={errors.temperatureValue}
            suffix={config?.unit}
            aria-label="体温值"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <PageHeader
        title="录入健康数据"
        backHref={ROUTES.HEALTH}
        rightAction={<FileEdit size={24} />}
      />

      {/* 记录类型选择 */}
      <section className={styles.typeSection} aria-label="选择记录类型">
        <div className={styles.typeGrid}>
          {RECORD_TYPES.map((type) => {
            const config = RECORD_TYPE_CONFIG[type];
            const selected = selectedType === type;
            return (
              <Card
                key={type}
                variant="solid"
                onClick={() => handleTypeChange(type as RecordType)}
                className={`${styles.typeCard} ${selected ? styles.typeCardSelected : ''}`}
                aria-pressed={selected}
                aria-label={config.label}
              >
                <div className={`${styles.typeIcon} ${selected ? styles.typeIconSelected : ''}`}>
                  {ICON_MAP[type]}
                </div>
                <span className={`${styles.typeLabel} ${selected ? styles.typeLabelSelected : ''}`}>
                  {config.label}
                </span>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 录入方式切换 */}
      <div className={styles.methodToggle} role="tablist" aria-label="录入方式">
        <Button
          type="button"
          role="tab"
          variant={inputMethod === 'manual' ? 'primary' : 'secondary'}
          size="lg"
          fullWidth
          leftIcon={<Edit3 size={18} />}
          onClick={() => handleMethodChange('manual')}
          aria-selected={inputMethod === 'manual'}
        >
          手动录入
        </Button>
        <Button
          type="button"
          role="tab"
          variant={inputMethod === 'voice' ? 'primary' : 'secondary'}
          size="lg"
          fullWidth
          leftIcon={<Mic size={20} />}
          onClick={() => handleMethodChange('voice')}
          aria-selected={inputMethod === 'voice'}
        >
          语音录入
        </Button>
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
        <div className={styles.fields}>
          {renderFormFields()}
        </div>
      </div>

      {/* 可选字段 */}
      <div className={styles.optionalSection}>
        <div className={styles.fieldGroup}>
          <label htmlFor="notes" className={styles.fieldLabel}>备注</label>
          <textarea
            id="notes"
            className={styles.textarea}
            placeholder="添加备注信息（可选）"
            value={formValues.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="symptoms" className={styles.fieldLabel}>症状</label>
          <textarea
            id="symptoms"
            className={styles.textarea}
            placeholder="描述当前症状（可选）"
            value={formValues.symptoms}
            onChange={(e) => updateField('symptoms', e.target.value)}
          />
        </div>
      </div>

      {/* 提交按钮 */}
      <div className={styles.submitSection}>
        <Button
          type="button"
          variant="success"
          size="lg"
          fullWidth
          leftIcon={<CheckCircle size={20} />}
          onClick={handleSubmit}
          loading={isSubmitting}
        >
          保存记录
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          onClick={handleCancel}
          className={styles.cancelBtn}
        >
          取消
        </Button>
      </div>

      {/* 成功提示 */}
      {showSuccess && (
        <div className={styles.successOverlay} role="alert">
          <Card variant="solid" className={styles.successCard}>
            <span className={styles.successIcon}><CheckCircle size={48} color="var(--color-success)" /></span>
            <span className={styles.successText}>记录保存成功！</span>
          </Card>
        </div>
      )}
    </div>
  );
}
