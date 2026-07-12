'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  backHref?: string;
  onBack?: () => void;
  backAriaLabel?: string;
  rightAction?: ReactNode;
  className?: string;
  transparent?: boolean;
}

export default function PageHeader({
  title,
  backHref,
  onBack,
  backAriaLabel = '返回',
  rightAction,
  className = '',
  transparent = false,
}: PageHeaderProps) {
  const backContent = (
    <span className={styles.backIcon} aria-hidden="true">
      <ChevronLeft size={24} strokeWidth={2.5} />
    </span>
  );

  return (
    <header
      className={`${styles.header} ${transparent ? styles.transparent : ''} ${className}`}
      role="banner"
    >
      <div className={styles.inner}>
        <div className={styles.left}>
          {onBack ? (
            <button
              type="button"
              className={styles.backButton}
              onClick={onBack}
              aria-label={backAriaLabel}
            >
              {backContent}
            </button>
          ) : backHref ? (
            <Link
              href={backHref}
              className={styles.backButton}
              aria-label={backAriaLabel}
            >
              {backContent}
            </Link>
          ) : null}
        </div>

        <h1 className={styles.title}>{title}</h1>

        <div className={styles.right}>
          {rightAction ? (
            <div className={styles.actionSlot}>{rightAction}</div>
          ) : (
            <div className={styles.spacer} aria-hidden="true" />
          )}
        </div>
      </div>
    </header>
  );
}
