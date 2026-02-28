'use client';

import { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, onClick, className, padding = 'md' }: CardProps) {
  const cls = [
    styles.card,
    styles[`padding-${padding}`],
    onClick && styles.interactive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <div className={cls} role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
        {children}
      </div>
    );
  }

  return <div className={cls}>{children}</div>;
}
