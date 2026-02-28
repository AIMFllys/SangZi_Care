// ============================================================
// 桑梓智护 — AI对话摘要看板卡片
// 在首页展示AI对话摘要，家属端标注关怀提示
// 需求: 17.1, 17.2, 17.3, 17.4, 17.5
// ============================================================

'use client';

import { useEffect } from 'react';
import { useSummaryStore } from '@/stores/summaryStore';
import { useUserStore } from '@/stores/userStore';

export default function SummaryCard() {
  const user = useUserStore((s) => s.user);
  const isElder = useUserStore((s) => s.isElder);
  const { summary, loading, fetchSummary } = useSummaryStore();

  useEffect(() => {
    if (user?.id) {
      fetchSummary(user.id);
    }
  }, [user?.id, fetchSummary]);

  if (loading || !summary) return null;

  return (
    <div
      style={{
        margin: '0 16px 16px',
        padding: '16px',
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--shadow-sm)',
      }}
      aria-label="AI对话摘要"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span aria-hidden="true">💬</span>
        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
          对话摘要
        </span>
      </div>
      <p style={{
        fontSize: 'var(--font-size-base)',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
      }}>
        {summary}
      </p>
      {!isElder && (
        <p style={{
          marginTop: '12px',
          fontSize: 'calc(var(--font-size-base) - 2px)',
          color: 'var(--color-primary)',
          fontStyle: 'italic',
        }}>
          💕 心灵相通是最好的医学治疗
        </p>
      )}
    </div>
  );
}
