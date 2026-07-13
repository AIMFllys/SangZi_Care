'use client';

import { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
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
  onKeyDown,
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

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);

    if (
      onClick &&
      !event.defaultPrevented &&
      !event.repeat &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cls}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
