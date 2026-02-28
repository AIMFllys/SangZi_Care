'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMessageStore } from '@/stores/messageStore';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';
import type { MessageResponse } from '@/stores/messageStore';

// ---------- 工具函数 ----------

/** 根据关系类型返回默认头像 emoji */
export function getRelationEmoji(relationship: string): string {
  const map: Record<string, string> = {
    '儿子': '👦',
    '女儿': '👧',
    '配偶': '💑',
    '父亲': '👴',
    '母亲': '👵',
    '孙子': '👦',
    '孙女': '👧',
  };
  return map[relationship] ?? '👤';
}

/** 格式化消息时间为简短展示 */
export function formatMessageTime(createdAt: string): string {
  if (!createdAt) return '';
  try {
    const date = new Date(createdAt);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (isToday) {
      return `${hours}:${minutes}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isYesterday) {
      return '昨天';
    }

    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return '';
  }
}

/** 获取消息预览文本 */
export function getMessagePreview(message?: MessageResponse): string {
  if (!message) return '暂无消息';
  if (message.type === 'voice') {
    const duration = message.audio_duration ? `${Math.round(message.audio_duration)}″` : '';
    return `🎤 语音消息 ${duration}`;
  }
  return message.content ?? '';
}

// ---------- 组件 ----------

export default function MessagesPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const binds = useFamilyStore((s) => s.binds);
  const fetchBinds = useFamilyStore((s) => s.fetchBinds);
  const { contacts, unreadTotal, loading, error, fetchContacts, fetchUnreadCount } =
    useMessageStore();

  // 加载绑定关系和联系人
  useEffect(() => {
    if (binds.length === 0) {
      fetchBinds();
    }
  }, [binds.length, fetchBinds]);

  // 绑定关系加载完成后构建联系人列表
  useEffect(() => {
    if (binds.length > 0 && user?.id) {
      fetchContacts(binds, user.id);
    }
  }, [binds, user?.id, fetchContacts]);

  // 获取未读总数
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const handleRetry = useCallback(() => {
    if (user?.id) {
      fetchContacts(binds, user.id);
    }
  }, [binds, user?.id, fetchContacts]);

  const handleContactClick = useCallback(
    (userId: string) => {
      router.push(ROUTES.MESSAGES_CHAT(userId));
    },
    [router],
  );

  // 无绑定关系 — 空状态
  const hasBinds = binds.length > 0;

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(ROUTES.HOME)}
          aria-label="返回首页"
          type="button"
        >
          ←
        </button>
        <h1 className={styles.title}>🗣️ 捂话</h1>
        {unreadTotal > 0 && (
          <span className={styles.unreadBadgeHeader} aria-label={`${unreadTotal}条未读消息`}>
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
      </header>

      {/* 加载状态 */}
      {loading && (
        <div className={styles.loading}>
          <span className={styles.loadingText}>加载中...</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <div className={styles.errorBox}>
          <span className={styles.errorText}>{error}</span>
          <button className={styles.retryBtn} onClick={handleRetry} type="button">
            重试
          </button>
        </div>
      )}

      {/* 空状态：无绑定关系 */}
      {!loading && !error && !hasBinds && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💬</span>
          <span className={styles.emptyText}>暂无联系人，请先绑定家属</span>
          <Link href={ROUTES.SETTINGS_BIND} className={styles.emptyLink}>
            去绑定家属
          </Link>
        </div>
      )}

      {/* 联系人列表 */}
      {!loading && !error && hasBinds && (
        <div className={styles.contactList} role="list" aria-label="联系人列表">
          {contacts.length === 0 && !loading ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>💬</span>
              <span className={styles.emptyText}>暂无消息记录</span>
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.userId}
                className={styles.contactItem}
                onClick={() => handleContactClick(contact.userId)}
                role="listitem"
                aria-label={`${contact.name}，${contact.relationship}${contact.unreadCount > 0 ? `，${contact.unreadCount}条未读` : ''}`}
                type="button"
              >
                {/* 头像 */}
                <div className={styles.avatar}>
                  {contact.avatarUrl ? (
                    <img
                      src={contact.avatarUrl}
                      alt={contact.name}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <span className={styles.avatarEmoji}>
                      {getRelationEmoji(contact.relationship)}
                    </span>
                  )}
                </div>

                {/* 联系人信息 */}
                <div className={styles.contactInfo}>
                  <div className={styles.contactTop}>
                    <span className={styles.contactName}>{contact.name}</span>
                    <span className={styles.contactRelation}>{contact.relationship}</span>
                  </div>
                  <div className={styles.contactBottom}>
                    <span className={styles.lastMessage}>
                      {getMessagePreview(contact.lastMessage)}
                    </span>
                  </div>
                </div>

                {/* 时间 + 未读 */}
                <div className={styles.contactMeta}>
                  {contact.lastMessage && (
                    <span className={styles.messageTime}>
                      {formatMessageTime(contact.lastMessage.created_at)}
                    </span>
                  )}
                  {contact.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>
                      {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
