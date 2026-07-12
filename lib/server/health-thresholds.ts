// ============================================================
// 桑梓智护 · 健康数据异常阈值判定
// ------------------------------------------------------------
// 对齐 backend/api/v1/health.py · HEALTH_THRESHOLDS / check_abnormal
// 录入时根据阈值判定异常并标记 is_abnormal / abnormal_reason。
// 仅服务端使用；禁止客户端 import。
// ============================================================

/** 健康数据异常阈值表（对齐 Python HEALTH_THRESHOLDS）。 */
export const HEALTH_THRESHOLDS = {
  blood_pressure: {
    systolic: { min: 90, max: 140 },
    diastolic: { min: 60, max: 90 },
  },
  blood_sugar: {
    fasting: { min: 3.9, max: 6.1 },
    postprandial: { min: 3.9, max: 7.8 },
  },
  heart_rate: { min: 60, max: 100 },
  temperature: { min: 36.0, max: 37.3 },
} as const;

/**
 * 支持的记录类型（对齐 Python RECORD_TYPES）。
 * weight 无阈值，恒为正常。
 */
export const RECORD_TYPES = [
  'blood_pressure',
  'blood_sugar',
  'heart_rate',
  'weight',
  'temperature',
] as const;

export type HealthRecordType = (typeof RECORD_TYPES)[number];

interface Range {
  min: number;
  max: number;
}

/** 从 values 中安全取出数值；非有限数字返回 null（对齐 Python None 跳过）。 */
function readNumber(values: Record<string, unknown>, key: string): number | null {
  const raw = values[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pushRangeReason(
  reasons: string[],
  value: number,
  range: Range,
  label: string,
): void {
  if (value < range.min) {
    reasons.push(`${label}偏低(${value}<${range.min})`);
  } else if (value > range.max) {
    reasons.push(`${label}偏高(${value}>${range.max})`);
  }
}

/**
 * 根据阈值判定健康数据是否异常。
 * 对齐 Python check_abnormal。
 * Returns: { is_abnormal, abnormal_reason } — 正常时 reason 为 null。
 */
export function checkAbnormal(
  record_type: string,
  values: Record<string, unknown>,
): { is_abnormal: boolean; abnormal_reason: string | null } {
  const reasons: string[] = [];

  if (record_type === 'blood_pressure') {
    const thresholds = HEALTH_THRESHOLDS.blood_pressure;
    const systolic = readNumber(values, 'systolic');
    const diastolic = readNumber(values, 'diastolic');
    if (systolic !== null) pushRangeReason(reasons, systolic, thresholds.systolic, '收缩压');
    if (diastolic !== null) pushRangeReason(reasons, diastolic, thresholds.diastolic, '舒张压');
  } else if (record_type === 'blood_sugar') {
    const value = readNumber(values, 'value');
    const measurementTypeRaw = values['measurement_type'];
    const measurementType =
      typeof measurementTypeRaw === 'string' && measurementTypeRaw
        ? measurementTypeRaw
        : 'fasting';
    const range =
      HEALTH_THRESHOLDS.blood_sugar[
        measurementType as keyof typeof HEALTH_THRESHOLDS.blood_sugar
      ];
    if (value !== null && range) {
      const label = measurementType === 'fasting' ? '空腹血糖' : '餐后血糖';
      pushRangeReason(reasons, value, range, label);
    }
  } else if (record_type === 'heart_rate') {
    const value = readNumber(values, 'value');
    if (value !== null) pushRangeReason(reasons, value, HEALTH_THRESHOLDS.heart_rate, '心率');
  } else if (record_type === 'temperature') {
    const value = readNumber(values, 'value');
    if (value !== null) pushRangeReason(reasons, value, HEALTH_THRESHOLDS.temperature, '体温');
  }
  // weight 无阈值，恒为正常

  if (reasons.length > 0) {
    return { is_abnormal: true, abnormal_reason: reasons.join('；') };
  }
  return { is_abnormal: false, abnormal_reason: null };
}
