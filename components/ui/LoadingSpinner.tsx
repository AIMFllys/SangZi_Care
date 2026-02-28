'use client';

import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function LoadingSpinner({ size = 'md', color }: LoadingSpinnerProps) {
  return (
    <span
      className={`${styles.spinner} ${styles[size]}`}
      style={color ? { borderTopColor: color } : undefined}
      role="status"
      aria-label="加载中"
    />
  );
}
