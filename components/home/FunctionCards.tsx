'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FUNCTION_CARDS } from '@/lib/constants';

// ---- 状态数据接口 ----

export interface FunctionCardStatusData {
  medicineRemaining?: number;
  medicineNextTime?: string;
  healthSummary?: string;
  unreadMessages?: number;
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

// ---- 卡片左色条颜色映射 (参考功能菜单成品图) ----

const CARD_BORDER_COLORS: Record<string, string> = {
  medicine: '#FF6B00',   // 橙色 — 用药管家
  health: '#2E5CDB',     // 蓝色 — 健康记录
  messages: '#2E7D32',   // 绿色 — 亲友消息
  radio: '#7B1FA2',      // 紫色 — 健康广播
};

const CARD_STATUS_BG: Record<string, string> = {
  medicine: 'bg-orange-50 text-orange-900',
  health: 'bg-blue-50 text-blue-900',
  messages: 'bg-green-50 text-green-900',
  radio: 'bg-purple-50 text-purple-900',
};

// ---- 单个功能卡片 — 参考功能菜单成品图 ----

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
  const borderColor = CARD_BORDER_COLORS[id] || 'var(--color-primary)';
  const statusBg = CARD_STATUS_BG[id] || 'bg-gray-50 text-gray-900';

  // Status highlight for warning/urgent
  let statusHighlight = '';
  if (status.type === 'warning') statusHighlight = 'font-bold';
  if (status.type === 'urgent') statusHighlight = 'font-bold text-red-700';

  return (
    <button
      className="w-full bg-white rounded-[24px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-between active:scale-[0.98] active:brightness-95 transition-all relative overflow-hidden text-left"
      style={{ borderLeft: `8px solid ${borderColor}` }}
      onClick={() => onNavigate(route)}
      aria-label={`${title}${status.text ? `，${status.text}` : ''}`}
      data-card-id={id}
    >
      <div className="flex flex-col items-start z-10 w-3/4">
        <div className="flex items-center mb-2">
          <span
            className="text-4xl mr-3"
            style={{ color: borderColor }}
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="text-[28px] font-bold text-[var(--color-text)]">{title}</span>
        </div>
        {status.text && (
          <div className={`${statusBg} px-4 py-2 rounded-xl mt-1`}>
            <p className={`text-xl font-medium ${statusHighlight}`}>
              {status.text}
            </p>
          </div>
        )}
      </div>

      {/* 右侧大箭头 — 参考成品图 chevron_right */}
      <span className="text-gray-400 text-5xl z-10 font-light" aria-hidden="true">›</span>
    </button>
  );
}

// ---- 主组件 ----

export interface FunctionCardsProps {
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
    <section className="w-full flex flex-col gap-4" aria-label="功能卡片列表">
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
    </section>
  );
}
