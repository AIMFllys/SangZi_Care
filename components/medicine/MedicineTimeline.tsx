'use client';

import { useCallback } from 'react';
import type { TodayTimelineItem, TimelineGroup } from '@/stores/medicineStore';
import { groupByPeriod } from '@/stores/medicineStore';

// ---------- 状态标签映射 ----------

const STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  taken: { label: '已服用', bgClass: 'bg-[#FFF3E8]', textClass: 'text-[#E65100]', borderClass: 'border-[#FFE0CC]' },
  pending: { label: '待服用', bgClass: 'bg-white', textClass: 'text-[#171717]', borderClass: 'border-black/10' },
  delayed: { label: '已延迟', bgClass: 'bg-[#fefce8]', textClass: 'text-[#854d0e]', borderClass: 'border-[#fef08a]' },
  skipped: { label: '已跳过', bgClass: 'bg-[#f3f4f6]', textClass: 'text-[#6b7280]', borderClass: 'border-[#e5e7eb]' },
};

// ---------- 单条用药卡片 ----------

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
      className={`relative pl-8 pb-8 border-l-[3px] border-black/5 last:border-transparent last:pb-0`}
      role="listitem"
    >
      {/* Timeline Dot */}
      <div className={`absolute left-[-11px] top-1 w-5 h-5 rounded-full border-[4px] border-[#FFF9F2] ${item.status === 'taken' ? 'bg-[var(--color-primary)]' : 'bg-[#d1d5db]'}`} />

      <div className={`flex flex-col gap-3 rounded-3xl p-5 border ${config.bgClass} ${config.borderClass} shadow-sm`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-[#4b5563] tracking-tighter">{item.scheduled_time}</span>
            <span className={`text-4xl font-bold mt-1 ${item.status === 'taken' || item.status === 'skipped' ? 'text-[#4b5563] line-through decoration-2' : 'text-[#171717]'}`}>
              {item.plan.medicine_name}
            </span>
          </div>
          <span className="text-xl font-medium bg-black/5 px-3 py-1 rounded-full text-[#4b5563]">
            {item.plan.dosage}
          </span>
        </div>

        <div className="flex justify-end mt-2">
          {canConfirm ? (
            <button
              className="interactive bg-[var(--color-primary)] text-white font-bold text-2xl py-4 px-8 rounded-full shadow-sm"
              onClick={handleConfirm}
              aria-label={`确认服用${item.plan.medicine_name}`}
            >
              💊 我已服药
            </button>
          ) : (
            <span
              className={`text-xl font-bold px-4 py-2 rounded-full ${config.bgClass} ${config.textClass}`}
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-4 py-1.5 rounded-full">{group.label}</span>
      </div>
      <div className="flex flex-col ml-[1.125rem]" role="list">
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
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-black/5 shadow-sm text-center gap-4">
        <span className="text-6xl" aria-hidden="true">💊</span>
        <p className="text-2xl font-bold text-[#4b5563]">今日暂无用药计划</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-10" aria-label="今日用药时间线">
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
