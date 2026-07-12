'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { Card } from '@/components/ui';
import { User, Users } from 'lucide-react';
import styles from './page.module.css';

type Role = 'elder' | 'family';

export default function OnboardingPage() {
  const router = useRouter();
  const { isReady } = useAuth();
  const setRole = useUserStore((s) => s.setRole);
  const [selecting, setSelecting] = useState<Role | null>(null);

  async function handleSelect(role: Role) {
    if (selecting) return;
    setSelecting(role);

    try {
      await setRole(role);
      router.replace(ROUTES.HOME);
    } catch {
      setSelecting(null);
    }
  }

  if (!isReady) {
    return <div className={styles.loading}>加载中…</div>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>欢迎使用桑梓智护</h1>
        <p className={styles.subtitle}>请选择您的身份</p>
      </div>

      <div className={styles.cards}>
        <Card
          variant="solid"
          className={`${styles.roleCard} ${styles.elderCard} ${selecting ? styles.roleCardDisabled : ''}`}
          onClick={selecting ? undefined : () => handleSelect('elder')}
        >
          <span className={styles.roleIcon} aria-hidden="true">
            <User size={48} color="var(--accent)" />
          </span>
          <span className={styles.roleLabel}>我是长辈</span>
          <span className={styles.roleDesc}>大字体、语音优先、简单易用</span>
        </Card>

        <Card
          variant="solid"
          className={`${styles.roleCard} ${styles.familyCard} ${selecting ? styles.roleCardDisabled : ''}`}
          onClick={selecting ? undefined : () => handleSelect('family')}
        >
          <span className={styles.roleIcon} aria-hidden="true">
            <Users size={48} color="var(--color-info)" />
          </span>
          <span className={styles.roleLabel}>我是家属</span>
          <span className={styles.roleDesc}>关注长辈健康、管理用药计划</span>
        </Card>
      </div>
    </main>
  );
}
