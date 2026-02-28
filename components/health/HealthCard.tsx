// ============================================================
// 桑梓智护 — 健康数据卡片组件
// ============================================================

import type { HealthRecordResponse } from '@/stores/healthStore';
import {
  RECORD_TYPE_CONFIG,
  formatHealthValue,
  formatMeasuredTime,
} from '@/stores/healthStore';
import styles from './HealthCard.module.css';

export interface HealthCardProps {
  /** 记录类型 */
  type: string;
  /** 最新记录，null 表示暂无数据 */
  record: HealthRecordResponse | null;
  /** 是否选中（高亮边框） */
  selected?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

export function HealthCard({ type, record, selected, onClick }: HealthCardProps) {
  const config = RECORD_TYPE_CONFIG[type];
  if (!config) return null;

  const isAbnormal = record?.is_abnormal === true;

  const cardClassName = [
    styles.card,
    selected ? styles.cardSelected : '',
    isAbnormal ? styles.cardAbnormal : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={cardClassName}
      onClick={onClick}
      aria-label={`${config.label}${record ? '' : ' 暂无数据'}`}
      type="button"
    >
      {/* 顶部：图标 + 名称 + 异常标记 */}
      <div className={styles.cardHeader}>
        <span className={styles.icon} aria-hidden="true">
          {config.icon}
        </span>
        <span className={styles.label}>{config.label}</span>
        {isAbnormal && (
          <span className={styles.abnormalBadge} data-testid="abnormal-badge">
            异常
          </span>
        )}
      </div>

      {record ? (
        <>
          {/* 数值 */}
          <div className={styles.valueSection}>
            <span
              className={`${styles.value} ${isAbnormal ? styles.valueAbnormal : ''}`}
            >
              {formatHealthValue(type, record.values)}
            </span>
            <span className={styles.unit}>{config.unit}</span>
          </div>
          {/* 测量时间 */}
          <span className={styles.time}>
            {formatMeasuredTime(record.measured_at)}
          </span>
        </>
      ) : (
        <div className={styles.noData}>
          <span className={styles.noDataText}>暂无数据</span>
        </div>
      )}
    </button>
  );
}
