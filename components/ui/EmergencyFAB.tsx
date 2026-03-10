'use client';

// ============================================================
// EmergencyFAB — 紧急呼叫浮动按钮（全局挂载）
// ============================================================

import { useEffect } from 'react';
import { useEmergency } from '@/hooks/useEmergency';
import type { EmergencyState } from '@/hooks/useEmergency';
import { useUserStore } from '@/stores/userStore';
import styles from './EmergencyFAB.module.css';

/**
 * 根据紧急呼叫状态渲染全屏弹窗内容
 */
function EmergencyOverlay({
  state,
  countdown,
  cancel,
  confirmNow,
  reset,
}: {
  state: EmergencyState;
  countdown: number;
  cancel: () => void;
  confirmNow: () => void;
  reset: () => void;
}) {
  // cancelled 状态短暂显示后自动重置
  useEffect(() => {
    if (state === 'cancelled') {
      const t = setTimeout(reset, 800);
      return () => clearTimeout(t);
    }
  }, [state, reset]);

  switch (state) {
    // 3秒确认倒计时
    case 'confirming':
      return (
        <div className={styles.overlay} role="alertdialog" aria-label="紧急呼叫确认">
          <div className={styles.countdown}>{countdown}</div>
          <p className={styles.statusText}>紧急呼叫即将拨出</p>
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={cancel}>
              取消
            </button>
            <button className={styles.confirmBtn} onClick={confirmNow}>
              立即拨打
            </button>
          </div>
        </div>
      );

    // 正在拨打家属
    case 'calling_family':
      return (
        <div className={styles.overlay} role="alert" aria-live="assertive">
          <p className={styles.statusText}>
            正在拨打家属电话<span className={styles.dots} />
          </p>
          <button className={styles.cancelBtn} onClick={cancel}>
            取消
          </button>
        </div>
      );

    // 等待拨打110倒计时
    case 'waiting_110':
      return (
        <div className={styles.overlay} role="alertdialog" aria-label="即将拨打110">
          <div className={styles.countdown}>{countdown}</div>
          <p className={styles.statusText}>即将拨打110</p>
          <button className={styles.cancelBtn} onClick={cancel}>
            取消
          </button>
        </div>
      );

    // 正在拨打110
    case 'calling_110':
      return (
        <div className={styles.overlay} role="alert" aria-live="assertive">
          <p className={styles.statusText}>
            正在拨打110<span className={styles.dots} />
          </p>
        </div>
      );

    // 流程完成
    case 'completed':
      return (
        <div className={styles.overlay} role="alert">
          <p className={styles.statusText}>已完成紧急呼叫</p>
          <button className={styles.resetBtn} onClick={reset}>
            关闭
          </button>
        </div>
      );

    // 无SIM卡/无权限
    case 'no_permission':
      return (
        <div className={styles.overlay} role="alert">
          <p className={styles.largeHint}>
            无法拨打电话
            <br />
            请检查SIM卡和权限
          </p>
          <button className={styles.resetBtn} onClick={reset}>
            关闭
          </button>
        </div>
      );

    // 已取消 — 短暂显示
    case 'cancelled':
      return (
        <div className={styles.overlay} role="status">
          <p className={styles.statusText}>已取消</p>
        </div>
      );

    default:
      return null;
  }
}

/**
 * EmergencyFAB — 紧急呼叫浮动按钮
 * 全局挂载在 layout.tsx 中，仅老年人端可见
 */
export default function EmergencyFAB() {
  const isElder = useUserStore((s) => s.isElder);
  const { state, countdown, trigger, cancel, confirmNow, reset } = useEmergency();

  // 仅老年人端显示
  if (!isElder) return null;

  const showOverlay = state !== 'idle';

  return (
    <>
      {/* FAB 按钮 — 始终显示（overlay 打开时隐藏在下层） */}
      {!showOverlay && (
        <div className={styles.fabContainer}>
          <button
            className={styles.fab}
            aria-label="紧急呼叫"
            onClick={trigger}
          >
            <div className={styles.fabIconWrap}>
              <span className={styles.fabIcon} style={{ fontVariationSettings: "'FILL' 1" }}>
                🆘
              </span>
            </div>
            <span className={styles.fabText}>紧急呼叫 (SOS)</span>
          </button>
        </div>
      )}

      {/* 全屏状态弹窗 */}
      {showOverlay && (
        <EmergencyOverlay
          state={state}
          countdown={countdown}
          cancel={cancel}
          confirmNow={confirmNow}
          reset={reset}
        />
      )}
    </>
  );
}
