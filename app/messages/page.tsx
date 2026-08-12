'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useMessageStore, type ContactInfo } from '@/stores/messageStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useFamilyBinds } from '@/hooks/useFamilyBinds';
import { getRelationIcon, formatMessageTime, getMessagePreview } from '@/lib/messageUtils';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import ContactPreferenceDialog from '@/components/messages/ContactPreferenceDialog';
import PageHeader from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MoreVertical, Pin, Plus, Users } from 'lucide-react';
import styles from './page.module.css';

const LONG_PRESS_MS = 550;
const LONG_PRESS_MOVE_PX = 10;

interface SelectedContact {
  ownerId: string;
  contact: ContactInfo;
  alias: string | null;
  isPinned: boolean;
}

export default function MessagesPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const { binds, isLoading: bindsLoading } = useFamilyBinds();
  const updateContactPreference = useFamilyStore((s) => s.updateContactPreference);
  const contacts = useMessageStore((s) => s.contacts);
  const contactsOwnerUserId = useMessageStore((s) => s.contactsOwnerUserId);
  const loading = useMessageStore((s) => s.loading);
  const error = useMessageStore((s) => s.error);
  const fetchContacts = useMessageStore((s) => s.fetchContacts);
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    peerId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressClickPeerRef = useRef<string | null>(null);
  const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.id && contactsOwnerUserId !== user.id) {
      void fetchContacts([], user.id);
    }
  }, [contactsOwnerUserId, fetchContacts, user?.id]);

  useEffect(() => {
    if (user?.id && !bindsLoading) {
      fetchContacts(binds, user.id);
    }
  }, [user?.id, binds, bindsLoading, fetchContacts]);

  useEffect(() => () => {
    if (longPressRef.current) clearTimeout(longPressRef.current.timer);
    if (suppressClickTimerRef.current) clearTimeout(suppressClickTimerRef.current);
  }, []);

  const preferenceFor = (contact: ContactInfo): SelectedContact => {
    const bind = binds.find((item) => item.user.id === contact.userId);
    return {
      ownerId: user?.id ?? '',
      contact,
      alias: bind?.bind.contact_preference?.alias ?? null,
      isPinned: bind?.bind.contact_preference?.is_pinned ?? contact.isPinned ?? false,
    };
  };

  const cancelLongPress = (): void => {
    if (longPressRef.current) clearTimeout(longPressRef.current.timer);
    longPressRef.current = null;
  };

  const startLongPress = (
    event: ReactPointerEvent<HTMLDivElement>,
    contact: ContactInfo,
  ): void => {
    cancelLongPress();
    const peerId = contact.userId;
    const timer = setTimeout(() => {
      suppressClickPeerRef.current = peerId;
      if (suppressClickTimerRef.current) clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = setTimeout(() => {
        if (suppressClickPeerRef.current === peerId) suppressClickPeerRef.current = null;
      }, 800);
      longPressRef.current = null;
      setSelectedContact(preferenceFor(contact));
    }, LONG_PRESS_MS);
    longPressRef.current = {
      timer,
      peerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const moveLongPress = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const pending = longPressRef.current;
    if (!pending) return;
    if (
      Math.abs(event.clientX - pending.startX) > LONG_PRESS_MOVE_PX
      || Math.abs(event.clientY - pending.startY) > LONG_PRESS_MOVE_PX
    ) cancelLongPress();
  };

  const openChat = (contact: ContactInfo): void => {
    if (suppressClickPeerRef.current === contact.userId) {
      suppressClickPeerRef.current = null;
      return;
    }
    router.push(`/messages/${contact.userId}`);
  };

  return (
    <div className={styles.page}>
      <PageHeader title="亲友联系人" transparent />

      <p className={styles.subtitle}>随时与您的至亲保持联系</p>

      <DataStateWrapper
        loading={loading}
        error={error}
        empty={contacts.length === 0 ? { icon: <Users size={48} />, title: '还没有联系人', description: '绑定家人后就能聊天啦' } : false}
        onRetry={() => user?.id && !bindsLoading && fetchContacts(binds, user.id)}
      >
        <div
          className={styles.contactList}
          role="list"
          aria-label="联系人列表"
          onScroll={cancelLongPress}
        >
          {contacts.map((contact) => {
            const relationIcon = getRelationIcon(contact.relationship);

            return (
              <Card
                key={contact.userId}
                variant="glass"
                className={styles.contactCard}
                role="listitem"
                data-contact-id={contact.userId}
                onPointerDown={(event) => startLongPress(event, contact)}
                onPointerMove={moveLongPress}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={(event) => {
                  event.preventDefault();
                  cancelLongPress();
                  setSelectedContact(preferenceFor(contact));
                }}
              >
                <button
                  type="button"
                  className={styles.contactMain}
                  aria-label={`和${contact.name}聊天`}
                  onClick={() => openChat(contact)}
                >
                  <div className={styles.avatarWrapper}>
                    <div className={styles.avatar}>{relationIcon}</div>
                  </div>

                  <div className={styles.contactInfo}>
                    <div className={styles.contactNameRow}>
                      <span className={styles.contactName}>{contact.name}</span>
                      <Badge variant="normal" className={styles.contactRelation}>{contact.relationship}</Badge>
                      {contact.isPinned && (
                        <span className={styles.pinned} title="已置顶"><Pin size={14} aria-hidden="true" />置顶</span>
                      )}
                    </div>
                    <div className={styles.contactPreview}>
                      {contact.lastMessage?.category === 'murmur' && (
                        <span className={styles.murmurPreviewTag}>碎碎念</span>
                      )}
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
                </button>

                <button
                  type="button"
                  className={styles.manageButton}
                  aria-label={`管理${contact.name}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setSelectedContact(preferenceFor(contact))}
                >
                  <MoreVertical size={24} aria-hidden="true" />
                </button>
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

      {selectedContact && user?.id === selectedContact.ownerId && (
        <ContactPreferenceDialog
          ownerId={selectedContact.ownerId}
          peerId={selectedContact.contact.userId}
          displayName={selectedContact.contact.name}
          initialAlias={selectedContact.alias}
          initialPinned={selectedContact.isPinned}
          onClose={() => setSelectedContact(null)}
          onSaved={(ownerId, peerId, preference) => {
            updateContactPreference(ownerId, peerId, preference);
          }}
        />
      )}
    </div>
  );
}
