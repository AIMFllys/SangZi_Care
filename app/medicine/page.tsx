'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useMedicineStore } from '@/stores/medicineStore';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import { Button, Card, IconButton } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import { Pill, Tablets, TestTube, Syringe, CheckCircle, Clock, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import styles from './page.module.css';

const PILL_COLORS = [styles.medicineIconInfo, styles.medicineIconDanger, styles.medicineIconWarning, styles.medicineIconSuccess];
const PILL_ICONS = [<Pill size={24} key="pill" />, <Tablets size={24} key="tablets" />, <TestTube size={24} key="tube" />, <Syringe size={24} key="syringe" />];

export default function MedicinePage() {
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
          <Card variant="glass" className={styles.voiceIndicator}>
            <div className={styles.voiceBars}>
              <div className={styles.bar} />
              <div className={styles.bar} />
              <div className={styles.bar} />
              <div className={styles.bar} />
            </div>
            语音提醒中...
          </Card>
          <IconButton
            aria-label="SOS 紧急呼叫"
            className={styles.sosBtn}
            onClick={() => { /* SOS 逻辑保留 */ }}
          >
            <span className={styles.sosText}>SOS</span>
          </IconButton>
        </div>

        <div className={styles.heroSection}>
          <div className={styles.pillIconWrapper}>
            <div className={styles.pillIconInner}>
              <Pill size={48} />
              <Tablets size={48} />
            </div>
          </div>
          <h1 className={styles.heroTitle}>该吃药啦！</h1>
          <p className={styles.heroSubtitle}>请服用您的晨间药物</p>
        </div>

        {/* 药品列表 */}
        <Card variant="solid" className={styles.medicineCard}>
          {currentMeds.map((med, i) => (
            <div key={`${med.plan.id}-${med.scheduled_time}`} className={styles.medicineItem}>
              <div className={`${styles.medicineIcon} ${PILL_COLORS[i % PILL_COLORS.length]}`}>
                {PILL_ICONS[i % PILL_ICONS.length]}
              </div>
              <div className={styles.medicineInfo}>
                <div className={styles.medicineName}>{med.plan.medicine_name}</div>
                <div className={styles.medicineDose}>{med.plan.dosage}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* 操作按钮 */}
        <div className={styles.actions}>
          <Button
            variant="success"
            size="lg"
            fullWidth
            leftIcon={<CheckCircle size={20} />}
            onClick={handleConfirm}
          >
            我已吃药
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            leftIcon={<Clock size={20} />}
            onClick={() => setShowReminder(false)}
          >
            15分钟后再提醒
          </Button>
        </div>
      </div>
    );
  }

  // 时间线列表视图
  return (
    <div className={styles.page}>
      <PageHeader title="用药管家" backHref="/" />

      <div className={styles.dateNav}>
        <IconButton aria-label="上一天">
          <ChevronLeft size={24} />
        </IconButton>
        <span className={styles.dateNavLabel}>今天</span>
        <IconButton aria-label="下一天">
          <ChevronRight size={24} />
        </IconButton>
      </div>

      <DataStateWrapper
        loading={isLoading}
        error={error}
        empty={todayTimeline.length === 0 ? { icon: <Pill size={48} />, title: '今天没有用药计划', description: '享受轻松的一天吧~' } : false}
        onRetry={() => fetchTodayTimeline()}
      >
        <div className={styles.timeline}>
          {todayTimeline.map((item) => (
            <Card key={`${item.plan.id}-${item.scheduled_time}`} variant="glass" className={styles.timeSlot}>
              <span className={styles.timeSlotTime}>{item.scheduled_time}</span>
              <span className={styles.timeSlotMed}>{item.plan.medicine_name} · {item.plan.dosage}</span>
              <span className={styles.timeSlotStatus}>
                {item.status === 'taken'
                  ? <CheckCircle size={20} color="var(--color-success)" />
                  : <Timer size={20} color="var(--text-muted)" />}
              </span>
            </Card>
          ))}
        </div>
      </DataStateWrapper>
    </div>
  );
}
