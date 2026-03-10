'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
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
        <button
          className={`${styles.roleCard} ${styles.elderCard}`}
          onClick={() => handleSelect('elder')}
          disabled={selecting !== null}
          aria-label="选择身份：我是长辈"
        >
          <span className={styles.roleEmoji} aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={48} color="currentColor" /></span>
          <span className={styles.roleLabel}>我是长辈</span>
          <span className={styles.roleDesc}>大字体、语音优先、简单易用</span>
        </button>

        <button
          className={`${styles.roleCard} ${styles.familyCard}`}
          onClick={() => handleSelect('family')}
          disabled={selecting !== null}
          aria-label="选择身份：我是家属"
        >
          <span className={styles.roleEmoji} aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={48} color="currentColor" /></span>
          <span className={styles.roleLabel}>我是家属</span>
          <span className={styles.roleDesc}>关注长辈健康、管理用药计划</span>
        </button>
      </div>
    </main>
  );
}
