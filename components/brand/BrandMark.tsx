import { useId } from 'react';
import styles from './BrandMark.module.css';

interface BrandMarkProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

/** 桑梓智护标识：暖心形 + 十字守护 */
export function BrandMark({ size = 88, animated = false, className = '' }: BrandMarkProps) {
  const gradientId = `sangzi-heart-${useId().replace(/:/g, '')}`;

  return (
    <div
      className={`${styles.mark} ${animated ? styles.animated : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 80" className={styles.svg}>
        <defs>
          <linearGradient id={gradientId} x1="16" y1="12" x2="64" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--accent-light)" />
            <stop offset="55%" stopColor="var(--accent-decoration)" />
            <stop offset="100%" stopColor="var(--accent-action)" />
          </linearGradient>
        </defs>
        <circle className={styles.halo} cx="40" cy="40" r="36" />
        <path
          className={styles.heart}
          d="M40 64.5C36.4 61 18 48.2 18 34.6C18 26.8 24.2 21 32 21C35.8 21 38.9 23.1 40 26.6C41.1 23.1 44.2 21 48 21C55.8 21 62 26.8 62 34.6C62 48.2 43.6 61 40 64.5Z"
          fill={`url(#${gradientId})`}
        />
        <path
          className={styles.cross}
          d="M37 30h6v9h9v6h-9v9h-6v-9h-9v-6h9z"
        />
      </svg>
    </div>
  );
}
