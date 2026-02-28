'use client';

import { useCallback } from 'react';
import type { TodayTimelineItem, TimelineGroup } from '@/stores/medicineStore';
import { groupByPeriod } from '@/stores/medicineStore';
import styles from './MedicineTimeline.module.css';

// ---------- 状态标签映射 ----------

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  taken: { label: '已服用 ✓', className: 'taken' },
  pending: { label: '待服用', className: 'pending' },
  delayed: { label: '已延迟', className: 'delayed' },
  skipped: { label: '已跳过', className: 'skipped' },
};

// ---------- 单条用药项 ----------

interface TimelineItemProps {
  item: TodayTimelineItem;
  onConfirm?: (planId: string, scheduledTime: string) => void;
}

function TimelineItem({ item, onConfirm }: TimelineItemProps) {
  const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const canConfirm = item.status === 'pending' || item.status === 'delayed';

  const handleConfirm = useCallback(() => {
    onConfirm?.(item.plan.id, item.scheduled_time);
  }, [onConfirm, item.plan.id, item.scheduled_time]);

  return (
    <div
      className={`${styles.item} ${styles[config.className] ?? ''}`}
      role="listitem"
    >
      <div className={styles.itemTime}>{item.scheduled_time}</div>
      <div className={styles.itemBody}>
        <div className={styles.itemInfo}>
          <span className={styles.medicineName}>
            {item.plan.medicine_name}
          </span>
          <span className={styles.dosage}>{item.plan.dosage}</span>
        </div>
        <div className={styles.itemAction}>
          {canConfirm ? (
            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              aria-label={`确认服用${item.plan.medicine_name}`}
            >
              已吃药
            </button>
          ) : (
            <span
              className={`${styles.statusBadge} ${styles[`badge_${config.className}`] ?? ''}`}
            >
              {config.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- 时段分组 ----------

interface PeriodGroupProps {
  group: TimelineGroup;
  onConfirm?: (planId: string, scheduledTime: string) => void;
}

function PeriodGroup({ group, onConfirm }: PeriodGroupProps) {
  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupLabel}>{group.label}</span>
      </div>
      <div className={styles.groupItems} role="list">
        {group.items.map((item) => (
          <TimelineItem
            key={`${item.plan.id}-${item.scheduled_time}`}
            item={item}
            onConfirm={onConfirm}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- 主组件 ----------

export interface MedicineTimelineProps {
  items: TodayTimelineItem[];
  onConfirm?: (planId: string, scheduledTime: string) => void;
}

export function MedicineTimeline({ items, onConfirm }: MedicineTimelineProps) {
  const groups = groupByPeriod(items);

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>💊</span>
        <p className={styles.emptyText}>今日暂无用药计划</p>
      </div>
    );
  }

  return (
    <section className={styles.timeline} aria-label="今日用药时间线">
      {groups.map((group) => (
        <PeriodGroup
          key={group.period}
          group={group}
          onConfirm={onConfirm}
        />
      ))}
    </section>
  );
}
