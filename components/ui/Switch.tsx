'use client';

import type { ButtonHTMLAttributes } from 'react';
import styles from './Switch.module.css';

interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'role' | 'aria-checked' | 'onChange'
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={[styles.switch, checked && styles.checked, className]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
