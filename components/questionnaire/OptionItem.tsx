'use client';

import type { QuestionType } from '@/lib/types/questionnaire';
import styles from './OptionItem.module.css';

interface OptionItemProps {
  type: QuestionType;
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
}

export function OptionItem({ type, name, label, checked, onSelect }: OptionItemProps) {
  return (
    <label className={`${styles.option} ${checked ? styles.checked : ''}`}>
      <input
        className={styles.input}
        type={type}
        name={name}
        value={label}
        checked={checked}
        onChange={onSelect}
      />
      <span className={styles.indicator} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </label>
  );
}
