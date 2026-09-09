'use client';

import { useEffect, useRef } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui';
import { useAuthContext } from '@/components/providers/AuthProvider';
import styles from './AuthRequiredDialog.module.css';

interface AuthRequiredDialogProps {
  splashDone: boolean;
}

export function AuthRequiredDialog({ splashDone }: AuthRequiredDialogProps) {
  const { loginPromptOpen, confirmLoginPrompt } = useAuthContext();
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = loginPromptOpen && splashDone;

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-required-title"
      aria-describedby="auth-required-desc"
    >
      <div className={styles.dialog} ref={dialogRef}>
        <BrandMark size={72} />
        <h2 id="auth-required-title" className={styles.title}>
          需要先登录
        </h2>
        <p id="auth-required-desc" className={styles.body}>
          登录后才能使用健康记录、用药提醒和早筛问卷。验证码会发到您的邮箱，我们不会打电话打扰您。
        </p>
        <Button variant="primary" size="lg" fullWidth onClick={confirmLoginPrompt}>
          去登录
        </Button>
      </div>
    </div>
  );
}
