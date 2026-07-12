'use client';

import { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'normal' | 'warning' | 'danger' | 'success';
  children: ReactNode;
}

export function Badge({
  variant = 'normal',
  children,
  className,
  ...rest
}: BadgeProps) {
  const cls = [styles.badge, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
