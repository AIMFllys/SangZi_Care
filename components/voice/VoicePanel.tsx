'use client';

// ============================================================
// 桑梓智护 — VoicePanel 语音面板组件
// 从屏幕顶部下滑拉出，展示AI对话历史和当前对话状态
// 需求: 3.4
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import type { Tables } from '@/types/supabase';
import styles from './VoicePanel.module.css';

type AIConversation = Tables<'oc_ai_conversations'>;

export type VoicePanelState = 'idle' | 'listening' | 'processing' | 'responding';

export interface VoicePanelProps {
  /** 面板是否打开 */
  isOpen: boolean;
  /** 关闭面板回调 */
  onClose: () => void;
  /** AI对话历史 */
  conversationHistory?: AIConversation[];
  /** 当前对话状态 */
  state?: VoicePanelState;
}

/** 各状态的中文标签 */
const STATE_LABELS: Record<VoicePanelState, string> = {
  idle: '等待中',
  listening: '正在聆听…',
  processing: '小护思考中…',
  responding: '小护回复中…',
};

/** 各状态的图标 */
const STATE_ICONS: Record<VoicePanelState, string> = {
  idle: '💤',
  listening: '👂',
  processing: '⏳',
  responding: '💬',
};

export default function VoicePanel({
  isOpen,
  onClose,
  conversationHistory = [],
  state = 'idle',
}: VoicePanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // 新消息时自动滚动到底部
  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [isOpen, conversationHistory.length]);

  // ESC 键关闭面板
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 打开时阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const stateDotClass = [
    styles.stateDot,
    state === 'listening' ? styles.stateDotListening : '',
    state === 'processing' ? styles.stateDotProcessing : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* 面板 */}
      <div
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="语音助手对话面板"
        aria-hidden={!isOpen}
      >
        {/* 头部 */}
        <div className={styles.header}>
          <h2 className={styles.title}>小护助手</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭语音面板"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* 状态指示 */}
        <div className={styles.stateBar} aria-live="polite">
          {state !== 'idle' && <span className={stateDotClass} />}
          <span className={styles.stateIcon} role="img" aria-hidden="true">
            {STATE_ICONS[state]}
          </span>
          <span>{STATE_LABELS[state]}</span>
        </div>

        {/* 对话列表 */}
        <div
          className={styles.messageList}
          ref={listRef}
          role="log"
          aria-label="对话历史"
          aria-live="polite"
        >
          {conversationHistory.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} role="img" aria-hidden="true">
                🎙️
              </span>
              <p className={styles.emptyText}>
                还没有对话记录
                <br />
                点击语音球开始和小护聊天吧
              </p>
            </div>
          ) : (
            conversationHistory.map((msg) => (
              <ConversationTurn key={msg.id} conversation={msg} />
            ))
          )}
        </div>

        {/* 底部拖拽手柄 */}
        <div className={styles.handle} aria-hidden="true">
          <div className={styles.handleBar} />
        </div>
      </div>
    </>
  );
}

// ============================================================
// 单轮对话组件（用户消息 + AI回复）
// ============================================================

interface ConversationTurnProps {
  conversation: AIConversation;
}

function ConversationTurn({ conversation }: ConversationTurnProps) {
  return (
    <>
      {/* 用户消息 — 右侧 */}
      {conversation.user_input && (
        <div className={`${styles.bubble} ${styles.bubbleUser}`}>
          <div className={`${styles.bubbleLabel} ${styles.bubbleUserLabel}`}>
            我
          </div>
          <div>{conversation.user_input}</div>
        </div>
      )}

      {/* AI回复 — 左侧 */}
      {conversation.ai_response && (
        <div className={`${styles.bubble} ${styles.bubbleAI}`}>
          <div className={styles.bubbleLabel}>小护</div>
          <div>{conversation.ai_response}</div>
        </div>
      )}
    </>
  );
}
