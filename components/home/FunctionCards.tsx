'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FUNCTION_CARDS } from '@/lib/constants';
import styles from './FunctionCards.module.css';

// ---- 状态数据接口 ----

/** 各功能卡片的实时状态数据（由父组件传入，可选） */
export interface FunctionCardStatusData {
  /** 用药管家：今日剩余用药次数 */
  medicineRemaining?: number;
  /** 用药管家：下一次用药时间（如 "14:00"） */
  medicineNextTime?: string;
  /** 健康记录：最近一次数据摘要（如 "血压 130/85"） */
  healthSummary?: string;
  /** 捂话：未读消息数 */
  unreadMessages?: number;
  /** 健康广播：推荐收听标题 */
  radioTitle?: string;
}

// ---- 状态提示生成 ----

type StatusInfo = { text: string; type: 'normal' | 'warning' | 'urgent' };

function getStatusForCard(
  cardId: string,
  data: FunctionCardStatusData,
): StatusInfo {
  switch (cardId) {
    case 'medicine': {
      const remaining = data.medicineRemaining;
      const next = data.medicineNextTime;
      if (remaining != null && next) {
        return {
          text: `还有${remaining}次用药 · ${next}`,
          type: remaining <= 1 ? 'warning' : 'normal',
        };
      }
      if (remaining != null) {
        return {
          text: `今日还有${remaining}次用药`,
          type: remaining <= 1 ? 'warning' : 'normal',
        };
      }
      return { text: '暂无用药计划', type: 'normal' };
    }

    case 'health': {
      if (data.healthSummary) {
        return { text: data.healthSummary, type: 'normal' };
      }
      return { text: '暂无健康数据', type: 'normal' };
    }

    case 'messages': {
      const count = data.unreadMessages;
      if (count != null && count > 0) {
        return {
          text: `${count}条未读消息`,
          type: count >= 5 ? 'urgent' : 'warning',
        };
      }
      return { text: '暂无新消息', type: 'normal' };
    }

    case 'radio': {
      if (data.radioTitle) {
        return { text: data.radioTitle, type: 'normal' };
      }
      return { text: '发现新内容', type: 'normal' };
    }

    default:
      return { text: '', type: 'normal' };
  }
}

// ---- 单个功能卡片 ----

interface FunctionCardProps {
  id: string;
  title: string;
  icon: string;
  route: string;
  status: StatusInfo;
  onNavigate: (route: string) => void;
}

function FunctionCard({
  id,
  title,
  icon,
  route,
  status,
  onNavigate,
}: FunctionCardProps) {
  return (
    <button
      className={styles.card}
      onClick={() => onNavigate(route)}
      aria-label={`${title}${status.text ? `，${status.text}` : ''}`}
      data-card-id={id}
    >
      <span className={styles.cardIcon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.cardContent}>
        <span className={styles.cardTitle}>{title}</span>
        {status.text && (
          <span
            className={`${styles.cardStatus} ${styles[`status_${status.type}`] ?? ''}`}
          >
            {status.text}
          </span>
        )}
      </div>
    </button>
  );
}

// ---- 主组件 ----

export interface FunctionCardsProps {
  /** 各卡片的实时状态数据（可选，缺省使用占位文案） */
  statusData?: FunctionCardStatusData;
}

export function FunctionCards({ statusData = {} }: FunctionCardsProps) {
  const router = useRouter();

  const handleNavigate = useCallback(
    (route: string) => {
      router.push(route);
    },
    [router],
  );

  return (
    <section className={styles.container} aria-label="功能卡片列表">
      <div className={styles.grid}>
        {FUNCTION_CARDS.map((card) => {
          const status = getStatusForCard(card.id, statusData);
          return (
            <FunctionCard
              key={card.id}
              id={card.id}
              title={card.title}
              icon={card.icon}
              route={card.route}
              status={status}
              onNavigate={handleNavigate}
            />
          );
        })}
      </div>
    </section>
  );
}
