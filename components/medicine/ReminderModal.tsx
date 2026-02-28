'use client';

// ============================================================
// 桑梓智护 — 用药提醒全屏弹窗
// 全屏显示当前时段药品，TTS自动播报，超大按钮确认/延迟
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useMedicineStore } from '@/stores/medicineStore';
import type { TodayTimelineItem } from '@/stores/medicineStore';
import styles from './ReminderModal.module.css';

// ---------- 类型定义 ----------

export interface ReminderModalProps {
  /** 弹窗是否打开 */
  isOpen: boolean;
  /** 当前时段的待服药项 */
  items: TodayTimelineItem[];
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** "等会吃"延迟回调 — 父组件负责15分钟后再次打开 */
  onDelay: () => void;
}

// ---------- TTS播报文本生成 ----------

/** 生成TTS播报文本 */
export function buildTTSText(items: TodayTimelineItem[]): string {
  if (items.length === 0) return '';

  const medicineList = items
    .map((item) => `${item.plan.medicine_name} ${item.plan.dosage}`)
    .join('，');

  return `现在该吃药了。${medicineList}`;
}

// ---------- 组件实现 ----------

export function ReminderModal({
  isOpen,
  items,
  onClose,
  onDelay,
}: ReminderModalProps) {
  const { speak, stop } = useTextToSpeech();
  const confirmMedication = useMedicineStore((s) => s.confirmMedication);

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // ------ TTS自动播报 ------

  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    const ttsText = buildTTSText(items);
    // 延迟一小段时间让弹窗渲染完成后再播报
    const timer = setTimeout(() => {
      speak(ttsText);
    }, 300);

    return () => {
      clearTimeout(timer);
      stop();
    };
    // 仅在 isOpen 和 items 变化时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, items]);

  // ------ 焦点管理 ------

  useEffect(() => {
    if (isOpen) {
      // 保存当前焦点
      previousFocusRef.current = document.activeElement as HTMLElement;
      // 聚焦到确认按钮
      requestAnimationFrame(() => {
        confirmBtnRef.current?.focus();
      });
    } else {
      // 恢复之前的焦点
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // ------ 焦点陷阱 ------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stop();
        onDelay();
        return;
      }

      // Tab焦点陷阱
      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onDelay, stop],
  );

  // ------ "已吃药"处理 ------

  const handleConfirm = useCallback(async () => {
    stop();
    // 逐个确认所有待服药项
    const pendingItems = items.filter(
      (item) => item.status === 'pending' || item.status === 'delayed',
    );
    for (const item of pendingItems) {
      await confirmMedication(item.plan.id, item.scheduled_time);
    }
    onClose();
  }, [items, confirmMedication, onClose, stop]);

  // ------ "等会吃"处理 ------

  const handleDelay = useCallback(() => {
    stop();
    onDelay();
  }, [onDelay, stop]);

  // ------ 不渲染条件 ------

  if (!isOpen || items.length === 0) return null;

  // 提取时间显示
  const scheduledTime = items[0]?.scheduled_time ?? '';

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="用药提醒"
      onKeyDown={handleKeyDown}
    >
      <div className={styles.modal} ref={modalRef}>
        {/* 头部 */}
        <div className={styles.header}>
          <span className={styles.headerIcon} aria-hidden="true">
            💊
          </span>
          <h2 className={styles.headerTitle}>该吃药了</h2>
          {scheduledTime && (
            <span className={styles.headerTime}>{scheduledTime}</span>
          )}
        </div>

        {/* 药品列表 */}
        <div
          className={styles.medicineList}
          role="list"
          aria-label="待服用药品"
        >
          {items.map((item) => (
            <div
              key={`${item.plan.id}-${item.scheduled_time}`}
              className={styles.medicineCard}
              role="listitem"
            >
              <span className={styles.medicineIcon} aria-hidden="true">
                💊
              </span>
              <div className={styles.medicineInfo}>
                <span className={styles.medicineName}>
                  {item.plan.medicine_name}
                </span>
                <span className={styles.medicineDosage}>
                  {item.plan.dosage}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 底部按钮 */}
        <div className={styles.actions}>
          <button
            ref={confirmBtnRef}
            className={styles.confirmBtn}
            onClick={handleConfirm}
            aria-label="确认已吃药"
          >
            ✅ 已吃药
          </button>
          <button
            className={styles.delayBtn}
            onClick={handleDelay}
            aria-label="等会吃，15分钟后再提醒"
          >
            ⏰ 等会吃
          </button>
        </div>
      </div>
    </div>
  );
}
