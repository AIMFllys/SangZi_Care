'use client';

// ============================================================
// 桑梓智护 — 消息列表组件
// 可滚动消息列表，自动滚动到底部，日期分隔符
// ============================================================

import { useEffect, useRef } from 'react';
import type { MessageResponse } from '@/stores/messageStore';
import ChatBubble from './ChatBubble';
import styles from './MessageList.module.css';

// ---------- 工具函数 ----------

/** 格式化日期为中文日期分隔符 */
export function formatDateSeparator(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (isToday) return '今天';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();
    if (isYesterday) return '昨天';

    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return '';
  }
}

/** 判断两条消息是否属于不同日期 */
export function isDifferentDay(a: string, b: string): boolean {
  if (!a || !b) return true;
  try {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() !== db.getFullYear() ||
      da.getMonth() !== db.getMonth() ||
      da.getDate() !== db.getDate()
    );
  } catch {
    return true;
  }
}

// ---------- Props ----------

export interface MessageListProps {
  messages: MessageResponse[];
  currentUserId: string;
  onPlayVoice: (message: MessageResponse) => void;
}

// ---------- 组件 ----------

export default function MessageList({ messages, currentUserId, onPlayVoice }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息时自动滚动到底部
  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  return (
    <div className={styles.list} data-testid="message-list" role="log" aria-label="消息列表">
      {messages.map((msg, index) => {
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const showDateSeparator =
          !prevMsg || isDifferentDay(prevMsg.created_at, msg.created_at);

        return (
          <div key={msg.id}>
            {/* 日期分隔符 */}
            {showDateSeparator && (
              <div className={styles.dateSeparator}>
                <span className={styles.dateText}>
                  {formatDateSeparator(msg.created_at)}
                </span>
              </div>
            )}

            {/* 聊天气泡 */}
            <ChatBubble
              message={msg}
              isMine={msg.sender_id === currentUserId}
              onPlayVoice={() => onPlayVoice(msg)}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
