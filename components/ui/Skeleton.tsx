import type { ReactNode } from 'react';
import styles from './Skeleton.module.css';

function Busy({
  label = '正在加载',
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} aria-busy="true" data-testid="page-skeleton">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function Bone({ className }: { className: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Busy className={styles.stack}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.row}>
          <Bone className={styles.avatar} />
          <div className={styles.lines}>
            <Bone className={styles.line} />
            <Bone className={styles.lineShort} />
          </div>
        </div>
      ))}
    </Busy>
  );
}

export function MetricCardsSkeleton() {
  return (
    <Busy className={styles.cards}>
      {Array.from({ length: 5 }, (_, index) => (
        <Bone key={index} className={styles.metric} />
      ))}
    </Busy>
  );
}

export function DashboardSkeleton() {
  return (
    <Busy className={styles.stack}>
      <Bone className={styles.hero} />
      <div className={styles.cards}>
        <Bone className={styles.metric} />
        <Bone className={styles.metric} />
      </div>
      <Bone className={styles.hero} />
    </Busy>
  );
}

export function TimelineSkeleton() {
  return (
    <Busy className={styles.stack}>
      {Array.from({ length: 4 }, (_, index) => (
        <Bone key={index} className={styles.timeline} />
      ))}
    </Busy>
  );
}

export function ChatSkeleton() {
  return (
    <Busy className={styles.chat}>
      <Bone className={styles.bubble} />
      <Bone className={`${styles.bubble} ${styles.bubbleAlt}`} />
      <Bone className={styles.bubble} />
      <Bone className={`${styles.bubble} ${styles.bubbleAlt}`} />
    </Busy>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Busy className={styles.form}>
      {Array.from({ length: fields }, (_, index) => (
        <Bone key={index} className={styles.field} />
      ))}
    </Busy>
  );
}
