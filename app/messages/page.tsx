'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useMessageStore } from '@/stores/messageStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useFamilyBinds } from '@/hooks/useFamilyBinds';
import { getRelationEmoji, formatMessageTime, getMessagePreview } from '@/lib/messageUtils';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import { ArrowRight, Users, Plus } from 'lucide-react';
import styles from './page.module.css';

export default function MessagesPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const { binds } = useFamilyBinds();
  const contacts = useMessageStore((s) => s.contacts);
  const loading = useMessageStore((s) => s.loading);
  const error = useMessageStore((s) => s.error);
  const fetchContacts = useMessageStore((s) => s.fetchContacts);

  useEffect(() => {
    if (user?.id && binds.length > 0) {
      // messageStore.fetchContacts 需要 binds 数组和当前用户 ID
      fetchContacts(binds, user.id);
    }
  }, [user?.id, binds, fetchContacts]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>亲友联系人</h1>
          <p className={styles.subtitle}>随时与您的至亲保持联系</p>
        </div>
        <div className={`glass-card ${styles.headerAction} interactive`}><ArrowRight size={24} /></div>
      </div>

      <DataStateWrapper
        loading={loading}
        error={error}
        empty={contacts.length === 0 ? { icon: <Users size={48} />, title: '还没有联系人', description: '绑定家人后就能聊天啦' } : false}
        onRetry={() => user?.id && binds.length > 0 && fetchContacts(binds, user.id)}
      >
        <div className={styles.contactList}>
          {contacts.map((contact) => {
            const emoji = getRelationEmoji(contact.relationship);

            return (
              <div key={contact.userId} className={`glass-card ${styles.contactCard} interactive`}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatar}>{emoji}</div>
                </div>

                <div className={styles.contactInfo} onClick={() => router.push(`/messages/${contact.userId}`)}>
                  <div>
                    <span className={styles.contactName}>{contact.name}</span>
                    <span className={styles.contactRelation}>{contact.relationship}</span>
                  </div>
                  <div className={styles.contactPreview}>
                    {contact.lastMessage
                      ? getMessagePreview(contact.lastMessage.type, contact.lastMessage.content || '')
                      : '暂无消息'}
                  </div>
                </div>

                <div className={styles.contactMeta}>
                  {contact.lastMessage?.created_at && (
                    <span className={styles.contactTime}>
                      {formatMessageTime(contact.lastMessage.created_at)}
                    </span>
                  )}
                  {contact.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>{contact.unreadCount}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`${styles.addCard} interactive`} onClick={() => router.push('/settings/bind')} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <Plus size={20} /> 添加亲友
        </div>
      </DataStateWrapper>
    </div>
  );
}
