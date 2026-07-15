'use client';

import { Plus, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCareRecipient } from '@/hooks/useCareRecipient';
import { displayElderRelation } from '@/lib/familyRelations';
import styles from './CareRecipientTabs.module.css';

interface CareRecipientTabsProps {
  className?: string;
  showAdd?: boolean;
}

export function CareRecipientTabs({
  className,
  showAdd = false,
}: CareRecipientTabsProps) {
  const router = useRouter();
  const {
    recipient,
    recipients,
    isFamily,
    selectRecipient,
  } = useCareRecipient();

  if (!isFamily) return null;

  return (
    <div
      className={[styles.scroller, className].filter(Boolean).join(' ')}
      role="tablist"
      aria-label="选择照护长辈"
    >
      {recipients.map((item) => {
        const isActive = item.id === recipient?.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => selectRecipient(item.id)}
          >
            <span className={styles.avatar} aria-hidden="true">
              {item.name.trim().slice(0, 1) || <UserRound size={18} />}
            </span>
            <span className={styles.copy}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.relation}>
                {displayElderRelation(item.relation)}
              </span>
            </span>
          </button>
        );
      })}

      {showAdd && (
        <button
          type="button"
          className={`${styles.tab} ${styles.add}`}
          onClick={() => router.push('/settings/bind')}
          aria-label="添加照护长辈"
        >
          <span className={styles.addIcon} aria-hidden="true">
            <Plus size={20} />
          </span>
          <span className={styles.addText}>添加长辈</span>
        </button>
      )}
    </div>
  );
}
