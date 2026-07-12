'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'soft';
  children: ReactNode;
  'aria-label': string;
}

export function IconButton({
  size = 'md',
  variant = 'ghost',
  children,
  className,
  ...rest
}: IconButtonProps) {
  const cls = [
    styles.iconButton,
    styles[variant],
    size !== 'md' && styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
