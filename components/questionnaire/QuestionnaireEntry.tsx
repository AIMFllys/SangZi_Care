'use client';

import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { QuestionnaireMark } from './QuestionnaireMark';
import styles from './QuestionnaireEntry.module.css';

interface QuestionnaireEntryProps {
  variant?: 'icon' | 'chip';
}

export function QuestionnaireEntry({ variant = 'icon' }: QuestionnaireEntryProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={`${styles.entry} ${variant === 'chip' ? styles.chip : styles.icon}`}
      aria-label="打开健康早筛问卷"
      onClick={() => router.push(ROUTES.QUESTIONNAIRE)}
    >
      <QuestionnaireMark size={variant === 'chip' ? 20 : 22} />
      {variant === 'chip' ? <span>问卷</span> : null}
    </button>
  );
}
