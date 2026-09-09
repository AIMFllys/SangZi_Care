import type { ReactNode } from 'react';
import styles from './HeaderActions.module.css';

export function HeaderActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
