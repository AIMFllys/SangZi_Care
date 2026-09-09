'use client';

import type { QuestionType } from '@/lib/types/questionnaire';
import styles from './OptionItem.module.css';

interface OptionItemProps {
  type: QuestionType;
  label: string;
  checked: boolean;
  onSelect: () => void;
}

export function OptionItem({ type, label, checked, onSelect }: OptionItemProps) {
  return (
    <button
      type="button"
      role={type === 'checkbox' ? 'checkbox' : 'radio'}
      aria-checked={checked}
      data-type={type}
      className={`${styles.option} ${checked ? styles.checked : ''}`}
      onClick={onSelect}
    >
      <span className={styles.indicator} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
