'use client';

import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import styles from './QuestionnaireEntry.module.css';

interface QuestionnaireEntryProps {
  variant?: 'icon' | 'chip';
}

export function QuestionnaireEntry({ variant = 'icon' }: QuestionnaireEntryProps) {
  const router = useRouter();
  const iconSize = variant === 'chip' ? 22 : 26;

  return (
    <button
      type="button"
      className={`${styles.entry} ${variant === 'chip' ? styles.chip : styles.icon}`}
      aria-label="打开健康早筛问卷"
      onClick={() => router.push(ROUTES.QUESTIONNAIRE)}
    >
      <ClipboardList size={iconSize} strokeWidth={2.25} aria-hidden="true" />
      {variant === 'chip' ? <span>问卷</span> : null}
    </button>
  );
}
