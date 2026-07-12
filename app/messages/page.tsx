'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useMessageStore } from '@/stores/messageStore';
import { useFamilyBinds } from '@/hooks/useFamilyBinds';
import { getRelationIcon, formatMessageTime, getMessagePreview } from '@/lib/messageUtils';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import PageHeader from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Users, Plus } from 'lucide-react';
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
      <PageHeader title="亲友联系人" transparent />

      <p className={styles.subtitle}>随时与您的至亲保持联系</p>

      <DataStateWrapper
        loading={loading}
        error={error}
        empty={contacts.length === 0 ? { icon: <Users size={48} />, title: '还没有联系人', description: '绑定家人后就能聊天啦' } : false}
        onRetry={() => user?.id && binds.length > 0 && fetchContacts(binds, user.id)}
      >
        <div className={styles.contactList}>
          {contacts.map((contact) => {
            const relationIcon = getRelationIcon(contact.relationship);

            return (
              <Card
                key={contact.userId}
                variant="glass"
                className={styles.contactCard}
                onClick={() => router.push(`/messages/${contact.userId}`)}
              >
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatar}>{relationIcon}</div>
                </div>

                <div className={styles.contactInfo}>
                  <div className={styles.contactNameRow}>
                    <span className={styles.contactName}>{contact.name}</span>
                    <Badge variant="normal" className={styles.contactRelation}>{contact.relationship}</Badge>
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
                    <Badge variant="danger" className={styles.unreadBadge}>{contact.unreadCount}</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

      </DataStateWrapper>

      <Card
        variant="glass"
        className={styles.addCard}
        onClick={() => router.push('/settings/bind')}
      >
        <Plus size={20} />
        <span>添加亲友</span>
      </Card>
    </div>
  );
}
