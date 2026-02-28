'use client';

// ============================================================
// 桑梓智护 — VoiceBall 语音球组件
// 首页中央的语音交互入口，直径 ≥ 屏幕宽度 40%
// 状态流转: idle → listening → processing → responding → idle
// 需求: 3.1, 3.3
// ============================================================

import { useCallback } from 'react';
import styles from './VoiceBall.module.css';

export type VoiceBallState = 'idle' | 'listening' | 'processing' | 'responding';

export interface VoiceBallProps {
  /** 当前语音球状态 */
  state?: VoiceBallState;
  /** 点击语音球时的回调（激活语音助手） */
  onActivate?: () => void;
}

/** 各状态对应的图标 */
const STATE_ICONS: Record<VoiceBallState, string> = {
  idle: '🎙️',
  listening: '👂',
  processing: '⏳',
  responding: '💬',
};

/** 各状态对应的球内标签 */
const STATE_LABELS: Record<VoiceBallState, string> = {
  idle: '点击说话',
  listening: '请说…',
  processing: '思考中',
  responding: '回复中',
};

/** 各状态对应的球下方提示文字 */
const STATE_HINTS: Record<VoiceBallState, string> = {
  idle: '点击语音球，和小护聊聊',
  listening: '正在聆听您的声音…',
  processing: '小护正在思考…',
  responding: '小护正在回复…',
};

/** 各状态的 aria-label */
const STATE_ARIA: Record<VoiceBallState, string> = {
  idle: '语音助手，点击开始说话',
  listening: '正在聆听，再次点击停止',
  processing: '正在处理您的语音',
  responding: '小护正在回复',
};

export default function VoiceBall({
  state = 'idle',
  onActivate,
}: VoiceBallProps) {
  const handleClick = useCallback(() => {
    onActivate?.();
  }, [onActivate]);

  const stateClass = styles[state] ?? '';

  return (
    <div className={styles.container}>
      <div className={`${styles.ballWrapper} ${stateClass}`}>
        {/* Listening 涟漪 */}
        {state === 'listening' && (
          <>
            <span className={`${styles.ripple} ${styles.ripple1}`} />
            <span className={`${styles.ripple} ${styles.ripple2}`} />
            <span className={`${styles.ripple} ${styles.ripple3}`} />
          </>
        )}

        {/* Processing 旋转环 */}
        {state === 'processing' && (
          <span className={styles.processingRing} />
        )}

        {/* 语音球主体 */}
        <button
          className={styles.ball}
          onClick={handleClick}
          aria-label={STATE_ARIA[state]}
          aria-live="polite"
          type="button"
        >
          <span className={styles.icon} role="img" aria-hidden="true">
            {STATE_ICONS[state]}
          </span>
          <span className={styles.label}>{STATE_LABELS[state]}</span>
        </button>
      </div>

      {/* 状态提示文字 */}
      <p className={styles.statusText} aria-live="polite">
        {STATE_HINTS[state]}
      </p>
    </div>
  );
}
