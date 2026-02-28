'use client';

// ============================================================
// 桑梓智护 — 聊天气泡组件
// 支持文字消息和语音消息，适老化大字体设计
// ============================================================

import type { MessageResponse } from '@/stores/messageStore';
import styles from './ChatBubble.module.css';

// ---------- 工具函数 ----------

/** 格式化时间戳为 HH:MM */
export function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/** 格式化语音时长 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0″';
  return `${Math.round(seconds)}″`;
}

// ---------- Props ----------

export interface ChatBubbleProps {
  message: MessageResponse;
  isMine: boolean;
  onPlayVoice?: () => void;
}

// ---------- 组件 ----------

export default function ChatBubble({ message, isMine, onPlayVoice }: ChatBubbleProps) {
  const isVoice = message.type === 'voice';
  const isAI = message.is_ai_generated;

  return (
    <div
      className={`${styles.wrapper} ${isMine ? styles.wrapperMine : styles.wrapperOther}`}
      data-testid="chat-bubble"
    >
      <div
        className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleOther}`}
      >
        {/* AI 生成标记 */}
        {isAI && <span className={styles.aiBadge}>AI</span>}

        {/* 文字消息 */}
        {!isVoice && (
          <p className={styles.textContent}>{message.content ?? ''}</p>
        )}

        {/* 语音消息 */}
        {isVoice && (
          <button
            className={styles.voiceBar}
            onClick={onPlayVoice}
            type="button"
            aria-label={`播放语音消息，时长${formatDuration(message.audio_duration)}`}
          >
            <span className={styles.playIcon}>▶</span>
            <span className={styles.voiceWave}>
              <span className={styles.waveLine} />
              <span className={styles.waveLine} />
              <span className={styles.waveLine} />
              <span className={styles.waveLine} />
              <span className={styles.waveLine} />
            </span>
            <span className={styles.duration}>
              {formatDuration(message.audio_duration)}
            </span>
          </button>
        )}

        {/* 语音消息的文字转写 */}
        {isVoice && message.content && (
          <p className={styles.voiceTranscript}>{message.content}</p>
        )}
      </div>

      {/* 时间戳 */}
      <span className={`${styles.timestamp} ${isMine ? styles.timestampMine : ''}`}>
        {formatTime(message.created_at)}
      </span>
    </div>
  );
}
