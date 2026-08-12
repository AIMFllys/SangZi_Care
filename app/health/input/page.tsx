'use client';

// ============================================================
// 桑梓智护 — 健康数据录入页
// 支持手动录入和语音录入，适老化超大数字输入设计
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthStore, RECORD_TYPE_CONFIG, RECORD_TYPES } from '@/stores/healthStore';
import type { HealthRecordCreate } from '@/stores/healthStore';
import {
  createInitialHealthDrafts,
  getDirtyHealthRecordTypes,
  getHealthSubmissionTypes,
} from './drafts';
import type {
  HealthDraft,
  HealthFormValues,
  HealthRecordType,
  InputMethod,
} from './drafts';
import { useUserStore } from '@/stores/userStore';
import { useCareRecipient } from '@/hooks/useCareRecipient';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { ROUTES } from '@/lib/constants';
import { Mic, Square, Edit3, FileEdit, CheckCircle, Activity, Droplet, Heart, Scale, Thermometer } from 'lucide-react';
import { Button, Input, Card, ConfirmDialog } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import { CareRecipientTabs } from '@/components/family/CareRecipientTabs';
import styles from './page.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  blood_pressure: <Droplet size={24} />,
  blood_sugar: <Activity size={24} />,
  heart_rate: <Heart size={24} />,
  weight: <Scale size={24} />,
  temperature: <Thermometer size={24} />,
};

// ---------- 类型 ----------

type RecordType = HealthRecordType;
type FormValues = HealthFormValues;

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

  const matches = text.match(/-?\d+(?:\.\d+)?|[零〇一二两三四五六七八九十百千万点]+/g);
  if (!matches) return [];

  return matches
    .map((token) => (/^-?\d/.test(token) ? Number(token) : parseChineseNumber(token)))
    .filter((value) => Number.isFinite(value) && value > 0);
}

const CHINESE_DIGITS: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4,
  五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

const CHINESE_UNITS: Record<string, number> = {
  十: 10, 百: 100, 千: 1_000, 万: 10_000,
};

function parseChineseInteger(text: string): number {
  if (!/[十百千万]/.test(text)) {
    const digits = Array.from(text, (char) => CHINESE_DIGITS[char]);
    return digits.some((digit) => digit === undefined)
      ? Number.NaN
      : Number(digits.join(''));
  }

  let total = 0;
  let section = 0;
  let current = 0;

  for (const char of text) {
    const digit = CHINESE_DIGITS[char];
    if (digit !== undefined) {
      current = digit;
      continue;
    }

    const unit = CHINESE_UNITS[char];
    if (!unit) return Number.NaN;
    if (unit === 10_000) {
      section += current;
      total += (section || 1) * unit;
      section = 0;
    } else {
      section += (current || 1) * unit;
    }
    current = 0;
  }

  return total + section + current;
}

function parseChineseNumber(text: string): number {
  const parts = text.split('点');
  if (parts.length > 2) return Number.NaN;

  const integer = parseChineseInteger(parts[0] || '零');
  if (parts.length === 1) return integer;

  const decimalDigits = Array.from(parts[1], (char) => CHINESE_DIGITS[char]);
  if (decimalDigits.length === 0 || decimalDigits.some((digit) => digit === undefined)) {
    return Number.NaN;
  }
  return integer + Number(`0.${decimalDigits.join('')}`);
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

// ---------- 组件 ----------

export default function HealthInputPage() {
  const router = useRouter();
  const createRecord = useHealthStore((s) => s.createRecord);
  const createRecordsBatch = useHealthStore((s) => s.createRecordsBatch);
  const currentUser = useUserStore((s) => s.user);
  const { recipient, targetUserId, isFamily } = useCareRecipient();
  const canEditHealth = Boolean(recipient?.permissions.canEditHealth);
  const {
    phase: recognitionPhase,
    error: recognitionError,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  } = useVoiceRecognition();

  // 状态
  const [selectedType, setSelectedType] = useState<RecordType>('blood_pressure');
  const [drafts, setDrafts] = useState<Record<RecordType, HealthDraft>>(
    () => createInitialHealthDrafts(),
  );
  const [errorsByType, setErrorsByType] = useState<Record<RecordType, FormErrors>>(
    () => ({
      blood_pressure: {}, blood_sugar: {}, heart_rate: {}, weight: {}, temperature: {},
    }),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRecords, setPendingRecords] = useState<HealthRecordCreate[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const voiceRunIdRef = useRef(0);
  const targetUserIdRef = useRef(targetUserId);
  const inputLocked = !targetUserId || !canEditHealth;
  const currentDraft = drafts[selectedType];
  const { values: formValues, inputMethod, voiceStage, voiceTranscript, voiceError } = currentDraft;
  const errors = errorsByType[selectedType];
  const dirtyRecordTypes = getDirtyHealthRecordTypes(drafts);
  const isDirty = dirtyRecordTypes.length > 0;

  const updateDraft = useCallback(
    (type: RecordType, update: (draft: HealthDraft) => HealthDraft) => {
      setDrafts((previous) => ({ ...previous, [type]: update(previous[type]) }));
    },
    [],
  );

  // ------ 字段更新 ------

  const updateField = useCallback(
    <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
      if (inputLocked) return;
      updateDraft(selectedType, (draft) => ({
        ...draft,
        values: { ...draft.values, [key]: value },
        voiceStage: inputMethod === 'voice' && voiceStage === 'confirmed'
          ? 'review'
          : draft.voiceStage,
      }));
      setErrorsByType((previous) => {
        const prev = previous[selectedType];
        if (key in prev) {
          const next = { ...prev };
          delete next[key as keyof FormErrors];
          return { ...previous, [selectedType]: next };
        }
        return previous;
      });
    },
    [inputLocked, inputMethod, selectedType, updateDraft, voiceStage],
  );

  const cancelVoiceSession = useCallback(() => {
    voiceRunIdRef.current += 1;
    cancelListening();
    updateDraft(selectedType, (draft) => ({
      ...draft,
      voiceStage: 'idle',
      voiceTranscript: '',
      voiceError: null,
    }));
  }, [cancelListening, selectedType, updateDraft]);

  // ------ 切换记录类型 ------

  const handleTypeChange = useCallback((type: RecordType) => {
    if (inputLocked || type === selectedType) return;
    cancelVoiceSession();
    setSelectedType(type);
    setErrorsByType((previous) => ({ ...previous, [type]: {} }));
  }, [cancelVoiceSession, inputLocked, selectedType]);

  // ------ 切换录入方式 ------

  const handleMethodChange = useCallback(
    (method: InputMethod) => {
      if (inputLocked || method === inputMethod) return;
      if (inputMethod === 'voice') cancelVoiceSession();
      updateDraft(selectedType, (draft) => ({ ...draft, inputMethod: method }));
    },
    [cancelVoiceSession, inputLocked, inputMethod, selectedType, updateDraft],
  );

  // ------ 语音按钮 ------

  const finishVoiceInput = useCallback(async (): Promise<void> => {
    const runId = voiceRunIdRef.current;
    updateDraft(selectedType, (draft) => ({
      ...draft,
      voiceStage: 'transcribing',
      voiceError: null,
    }));

    try {
      const result = await stopListening();
      if (voiceRunIdRef.current !== runId) return;
      const finalTranscript = result?.transcript.trim() ?? '';
      if (!finalTranscript) throw new Error('未识别到有效语音，请重试');

      const parsed = parseVoiceForType(finalTranscript, selectedType);
      if (Object.keys(parsed).length === 0) {
        throw new Error('没有听清健康数值，请重试');
      }

      updateDraft(selectedType, (draft) => ({
        ...draft,
        values: { ...draft.values, ...parsed },
        voiceTranscript: finalTranscript,
        voiceStage: 'review',
        voiceError: null,
      }));
      setErrorsByType((previous) => ({ ...previous, [selectedType]: {} }));
    } catch (error) {
      if (voiceRunIdRef.current !== runId) return;
      updateDraft(selectedType, (draft) => ({
        ...draft,
        voiceError: error instanceof Error ? error.message : '语音识别失败，请重试',
        voiceStage: 'error',
      }));
    }
  }, [selectedType, stopListening, updateDraft]);

  const handleMicToggle = useCallback(async (): Promise<void> => {
    if (inputLocked) return;
    if (voiceStage === 'recording') {
      await finishVoiceInput();
      return;
    }
    if (voiceStage === 'transcribing') return;

    const runId = ++voiceRunIdRef.current;
    updateDraft(selectedType, (draft) => ({
      ...draft,
      voiceTranscript: '',
      voiceError: null,
      voiceStage: 'recording',
      inputMethod: 'voice',
    }));
    resetTranscript();

    try {
      await startListening();
    } catch (error) {
      if (voiceRunIdRef.current !== runId) return;
      updateDraft(selectedType, (draft) => ({
        ...draft,
        voiceError: error instanceof Error ? error.message : '无法开始录音，请检查麦克风权限',
        voiceStage: 'error',
      }));
    }
  }, [finishVoiceInput, inputLocked, resetTranscript, selectedType, startListening, updateDraft, voiceStage]);

  useEffect(() => {
    if (targetUserIdRef.current === targetUserId) return;
    targetUserIdRef.current = targetUserId;
    cancelVoiceSession();
    setSelectedType('blood_pressure');
    setDrafts(createInitialHealthDrafts());
    setErrorsByType({
      blood_pressure: {}, blood_sugar: {}, heart_rate: {}, weight: {}, temperature: {},
    });
    setIsSubmitting(false);
    setShowSuccess(false);
    setShowConfirm(false);
  }, [cancelVoiceSession, targetUserId]);

  useEffect(() => {
    if (voiceStage === 'recording' && recognitionPhase === 'success') {
      void finishVoiceInput();
    }
  }, [finishVoiceInput, recognitionPhase, voiceStage]);

  useEffect(() => {
    if (inputMethod !== 'voice' || !recognitionError || voiceStage === 'idle') return;
    updateDraft(selectedType, (draft) => ({
      ...draft,
      voiceError: recognitionError,
      voiceStage: 'error',
    }));
  }, [inputMethod, recognitionError, selectedType, updateDraft, voiceStage]);

  useEffect(() => () => {
    voiceRunIdRef.current += 1;
    cancelListening();
  }, [cancelListening]);

  // ------ 提交 ------

  const handleSubmit = useCallback(async () => {
    if (!targetUserId || !canEditHealth) return;

    const dirtyTypes = getDirtyHealthRecordTypes(drafts);
    const candidates = getHealthSubmissionTypes(drafts);
    if (dirtyTypes.length === 0) {
      const validationErrors = validateFormValues(selectedType, formValues);
      setErrorsByType((previous) => ({ ...previous, [selectedType]: validationErrors }));
      return;
    }

    const nextErrors: Record<RecordType, FormErrors> = {
      blood_pressure: {}, blood_sugar: {}, heart_rate: {}, weight: {}, temperature: {},
    };
    let firstInvalid: RecordType | null = null;
    for (const recordType of dirtyTypes) {
      const draft = drafts[recordType];
      const validationErrors = validateFormValues(recordType, draft.values);
      if (draft.inputMethod === 'voice' && draft.voiceStage !== 'confirmed') {
        nextErrors[recordType] = validationErrors;
        if (!firstInvalid) firstInvalid = recordType;
        updateDraft(recordType, (current) => ({ ...current, voiceError: '请先确认语音解析结果' }));
        continue;
      }
      nextErrors[recordType] = validationErrors;
      if (Object.keys(validationErrors).length > 0 && !firstInvalid) firstInvalid = recordType;
    }
    setErrorsByType(nextErrors);
    if (firstInvalid) {
      setSelectedType(firstInvalid);
      return;
    }

    const measuredAt = new Date().toISOString();
    const records: HealthRecordCreate[] = candidates.map((recordType) => {
      const draft = drafts[recordType];
      return {
        user_id: targetUserId,
        record_type: recordType,
        values: buildRecordValues(recordType, draft.values),
        measured_at: measuredAt,
        input_method: targetUserId === currentUser?.id ? draft.inputMethod : 'family',
        recorded_by: currentUser?.id,
        notes: draft.values.notes.trim() || undefined,
        symptoms: draft.values.symptoms.trim() || undefined,
      };
    });
    setPendingRecords(records);
    setSubmitError(null);

    // 保持旧测试/临时 store 实现可用；生产 store 始终提供事务批量接口。
    if (!createRecordsBatch) {
      setIsSubmitting(true);
      try {
        await createRecord(records[0]);
        setShowSuccess(true);
      } catch {
        setSubmitError('保存失败，请重试');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setShowConfirm(true);
  }, [
    canEditHealth,
    createRecord,
    createRecordsBatch,
    currentUser,
    drafts,
    formValues,
    selectedType,
    targetUserId,
    updateDraft,
  ]);

  // ------ 取消 ------

  const leavePage = useCallback(() => {
    cancelVoiceSession();
    router.push(ROUTES.HEALTH);
  }, [cancelVoiceSession, router]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowConfirm(true);
      setPendingRecords([]);
      return;
    }
    leavePage();
  }, [isDirty, leavePage]);

  const confirmDialogCancel = useCallback(() => {
    setShowConfirm(false);
    setPendingRecords([]);
  }, []);

  const confirmDialogConfirm = useCallback(async () => {
    if (pendingRecords.length === 0) {
      setShowConfirm(false);
      leavePage();
      return;
    }
    if (!createRecordsBatch) return;
    setIsSubmitting(true);
    try {
      await createRecordsBatch({ user_id: targetUserId ?? undefined, records: pendingRecords });
      setShowConfirm(false);
      setDrafts(createInitialHealthDrafts());
      setShowSuccess(true);
      setPendingRecords([]);
      setTimeout(() => router.push(ROUTES.HEALTH), 1500);
    } catch {
      setSubmitError('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [createRecordsBatch, leavePage, pendingRecords, router, targetUserId]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const marker = { healthInputGuard: true };
    window.history.pushState(marker, '', window.location.href);
    const onPopState = () => {
      if (isDirty) {
        window.history.pushState(marker, '', window.location.href);
        setShowConfirm(true);
        setPendingRecords([]);
      } else {
        router.push(ROUTES.HEALTH);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDirty, router]);

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
        title={isFamily && recipient ? `为${recipient.name}记录` : '录入健康数据'}
        subtitle={isFamily ? '家属代录将保留操作人审计' : undefined}
        variant="detail"
        onBack={handleCancel}
        rightAction={<FileEdit size={24} />}
      />

      <div className={styles.scroller}>
      <CareRecipientTabs className={styles.recipientTabs} />
      {isFamily && !canEditHealth && (
        <Card variant="solid" className={styles.permissionNotice} role="status">
          当前长辈尚未授权代录健康数据，可请长辈在“家庭绑定”中开启权限。
        </Card>
      )}
      <fieldset className={styles.inputFieldset} disabled={inputLocked}>
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
                aria-disabled={inputLocked}
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
          size="md"
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
          size="md"
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
              className={`${styles.micBtn} ${voiceStage === 'recording' ? styles.micBtnListening : ''}`}
              onClick={() => void handleMicToggle()}
              aria-label={voiceStage === 'recording' ? '停止录音' : '开始录音'}
              disabled={inputLocked || voiceStage === 'transcribing'}
            >
              {voiceStage === 'recording' ? <Square size={32} /> : <Mic size={32} />}
            </button>
            <span className={styles.voiceHint} aria-live="polite">
              {voiceStage === 'recording' && '正在聆听，请说出数值...'}
              {voiceStage === 'transcribing' && '正在识别，请稍候...'}
              {voiceStage === 'review' && '请核对下方数值，确认后再保存'}
              {voiceStage === 'confirmed' && '解析结果已确认，可以保存'}
              {(voiceStage === 'idle' || voiceStage === 'error') && '点击麦克风开始语音录入'}
            </span>
            {voiceTranscript && (
              <div className={styles.voiceTranscript} aria-live="polite">
                <strong>识别内容</strong>
                <span>{voiceTranscript}</span>
              </div>
            )}
            {voiceError && (
              <p className={styles.voiceError} role="alert">{voiceError}</p>
            )}
          </div>
        )}

        {/* 数值输入字段 */}
        <div className={styles.fields}>
          {renderFormFields()}
        </div>
        {inputMethod === 'voice' && (voiceStage === 'review' || voiceStage === 'confirmed') && (
          <div className={styles.voiceActions}>
            <Button
              type="button"
              variant={voiceStage === 'confirmed' ? 'secondary' : 'success'}
              size="md"
              fullWidth
              onClick={() => {
                updateDraft(selectedType, (draft) => ({
                  ...draft,
                  voiceError: null,
                  voiceStage: 'confirmed',
                }));
              }}
              disabled={voiceStage === 'confirmed'}
            >
              {voiceStage === 'confirmed' ? '已确认' : '确认解析结果'}
            </Button>
          </div>
        )}
      </div>

      {/* 可选字段 */}
      <details className={styles.optionalSection}>
        <summary className={styles.optionalSummary}>补充备注与症状（可选）</summary>
        <div className={styles.optionalFields}>
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
      </details>
      </fieldset>
      </div>

      {/* 提交按钮 */}
      <div className={styles.submitSection}>
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
        <Button
          type="button"
          variant="success"
          size="lg"
          fullWidth
          leftIcon={<CheckCircle size={20} />}
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={
            !targetUserId
            || !canEditHealth
            || voiceStage === 'recording'
            || voiceStage === 'transcribing'
          }
        >
          保存记录
        </Button>
      </div>

      {submitError && (
        <p role="alert" className={styles.submitError}>{submitError}</p>
      )}

      <ConfirmDialog
        open={showConfirm}
        title={pendingRecords.length > 0 ? '确认保存健康记录' : '放弃未保存的健康草稿？'}
        description={pendingRecords.length > 0 ? '以下记录将一次性保存，任一条失败都会全部回滚。' : '离开后本页未保存的内容将被清除。'}
        cancelLabel="继续编辑"
        confirmLabel={pendingRecords.length > 0 ? '确认保存' : '放弃离开'}
        onCancel={confirmDialogCancel}
        onConfirm={() => void confirmDialogConfirm()}
      >
        {pendingRecords.length > 0 && (
          <ul className={styles.confirmSummary} aria-label="待保存的健康记录">
            {pendingRecords.map((record) => (
              <li key={`${record.record_type}-${record.measured_at}`}>
                {RECORD_TYPE_CONFIG[record.record_type]?.label ?? record.record_type}
                <span>{new Date(record.measured_at).toLocaleString('zh-CN')}</span>
              </li>
            ))}
          </ul>
        )}
      </ConfirmDialog>

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
