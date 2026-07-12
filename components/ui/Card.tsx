'use client';

import { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid';
  children: ReactNode;
  onClick?: () => void;
}

export function Card({
  variant = 'glass',
  children,
  className,
  onClick,
  ...rest
}: CardProps) {
  const cls = [
    styles.card,
    styles[variant],
    onClick && 'interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cls}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
