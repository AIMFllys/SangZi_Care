'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useMedicineStore } from '@/stores/medicineStore';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import styles from './page.module.css';

const PILL_COLORS = [styles.medicineIconBlue, styles.medicineIconPink, styles.medicineIconGreen, styles.medicineIconOrange];
const PILL_EMOJIS = ['💊', '🩹', '💉', '🧴'];

export default function MedicinePage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);

  const todayTimeline = useMedicineStore((s) => s.todayTimeline);
  const isLoading = useMedicineStore((s) => s.isLoading);
  const error = useMedicineStore((s) => s.error);
  const fetchTodayTimeline = useMedicineStore((s) => s.fetchTodayTimeline);
  const confirmMedication = useMedicineStore((s) => s.confirmMedication);

  const [showReminder, setShowReminder] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTodayTimeline();
    }
  }, [user?.id, fetchTodayTimeline]);

  const pendingMeds = todayTimeline.filter((t) => t.status !== 'taken');
  const currentMeds = pendingMeds.slice(0, 3);

  const handleConfirm = async () => {
    for (const med of currentMeds) {
      await confirmMedication(med.plan.id, med.scheduled_time);
    }
    setShowReminder(false);
  };

  // 提醒视图：单屏 ≤ 2 核心操作
  if (showReminder && currentMeds.length > 0) {
    return (
      <div className={styles.page}>
        {/* 顶部状态栏 */}
        <div className={styles.topBar}>
          <div className={`glass-card ${styles.voiceIndicator}`}>
            <div className={styles.voiceBars}>
              <div className={styles.bar} />
              <div className={styles.bar} />
              <div className={styles.bar} />
              <div className={styles.bar} />
            </div>
            语音提醒中...
          </div>
          <button className={styles.sosBtn} aria-label="SOS 紧急呼叫">SOS</button>
        </div>

        {/* 药瓶图标 */}
        <div className={styles.heroSection}>
          <div className={styles.pillIconWrapper}>
            <div className={styles.pillIconInner}>🏥</div>
          </div>
          <h1 className={styles.heroTitle}>该吃药啦！</h1>
          <p className={styles.heroSubtitle}>请服用您的晨间药物</p>
        </div>

        {/* 药品列表 */}
        <div className={`glass-card ${styles.medicineCard}`}>
          {currentMeds.map((med, i) => (
            <div key={`${med.plan.id}-${med.scheduled_time}`} className={styles.medicineItem}>
              <div className={`${styles.medicineIcon} ${PILL_COLORS[i % PILL_COLORS.length]}`}>
                {PILL_EMOJIS[i % PILL_EMOJIS.length]}
              </div>
              <div>
                <div className={styles.medicineName}>{med.plan.medicine_name}</div>
                <div className={styles.medicineDose}>{med.plan.dosage}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            ✅ 我已吃药
          </button>
          <button className={styles.snoozeBtn} onClick={() => setShowReminder(false)}>
            ⏰ 15分钟后再提醒
          </button>
        </div>
      </div>
    );
  }

  // 时间线列表视图
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.dateNavBtn} onClick={() => router.back()}>←</button>
        <h1 style={{ fontSize: 'var(--font-heading)', fontWeight: 700 }}>用药管家</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.dateNav}>
        <button className={styles.dateNavBtn}>‹</button>
        <span className={styles.dateNavLabel}>今天</span>
        <button className={styles.dateNavBtn}>›</button>
      </div>

      <DataStateWrapper
        loading={isLoading}
        error={error}
        empty={todayTimeline.length === 0 ? { icon: '💊', title: '今天没有用药计划', description: '享受轻松的一天吧~' } : false}
        onRetry={() => fetchTodayTimeline()}
      >
        <div className={styles.timeline}>
          {todayTimeline.map((item) => (
            <div key={`${item.plan.id}-${item.scheduled_time}`} className={`glass-card ${styles.timeSlot} interactive`}>
              <span className={styles.timeSlotTime}>{item.scheduled_time}</span>
              <span className={styles.timeSlotMed}>{item.plan.medicine_name} · {item.plan.dosage}</span>
              <span className={styles.timeSlotStatus}>{item.status === 'taken' ? '✅' : '⏳'}</span>
            </div>
          ))}
        </div>
      </DataStateWrapper>
    </div>
  );
}
