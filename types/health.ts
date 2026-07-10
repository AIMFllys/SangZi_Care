/**
 * 桑梓智护 — 健康数据值类型定义
 * 替代 Record<string, any>，为每种记录类型提供精确的类型安全
 */

/** 血压数据值 (可能只有收缩压或舅张压) */
export interface BloodPressureValues {
  systolic?: number | null;
  diastolic?: number | null;
}

/** 血糖数据值 */
export interface BloodSugarValues {
  value: number;
  /** 空腹/餐后 */
  timing?: 'fasting' | 'postprandial';
}

/** 心率数据值 */
export interface HeartRateValues {
  value: number | null;
}

/** 体重数据值 */
export interface WeightValues {
  value: number;
}

/** 体温数据值 */
export interface TemperatureValues {
  value: number;
}

/** 所有健康数据值的联合类型 */
export type HealthValues =
  | BloodPressureValues
  | BloodSugarValues
  | HeartRateValues
  | WeightValues
  | TemperatureValues;

/** 记录类型字符串 */
export type HealthRecordType =
  | 'blood_pressure'
  | 'blood_sugar'
  | 'heart_rate'
  | 'weight'
  | 'temperature';

/** 类型守卫：判断是否为血压数据 */
export function isBloodPressureValues(values: HealthValues): values is BloodPressureValues {
  return 'systolic' in values || 'diastolic' in values;
}

/** 类型守卫：判断是否为单值数据 (心率/血糖/体重/体温) */
export function isSingleValueRecord(values: HealthValues): values is { value: number } {
  return 'value' in values;
}
