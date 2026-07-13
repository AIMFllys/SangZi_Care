'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useMedicineStore } from '@/stores/medicineStore';
import { fetchApi } from '@/lib/api';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import { Button, Card, IconButton } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import { Pill, Tablets, TestTube, Syringe, CheckCircle, Clock, History, Timer } from 'lucide-react';
import styles from './page.module.css';

const PILL_COLORS = [styles.medicineIconInfo, styles.medicineIconDanger, styles.medicineIconWarning, styles.medicineIconSuccess];
const PILL_ICONS = [<Pill size={24} key="pill" />, <Tablets size={24} key="tablets" />, <TestTube size={24} key="tube" />, <Syringe size={24} key="syringe" />];

export default function MedicinePage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);

  const todayTimeline = useMedicineStore((s) => s.todayTimeline);
  const isLoading = useMedicineStore((s) => s.isLoading);
  const error = useMedicineStore((s) => s.error);
  const fetchTodayTimeline = useMedicineStore((s) => s.fetchTodayTimeline);
  const confirmMedication = useMedicineStore((s) => s.confirmMedication);
  const { speak, stop } = useTextToSpeech();
  const spokenReminderKeyRef = useRef<string | null>(null);

  const [showReminder, setShowReminder] = useState(() => {
    if (typeof window === 'undefined') return true;
    const deferredUntil = Number(window.sessionStorage.getItem('medicine-reminder-deferred-until'));
    return !Number.isFinite(deferredUntil) || deferredUntil <= Date.now();
  });
  const [sosMessage, setSosMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchTodayTimeline();
    }
  }, [user?.id, fetchTodayTimeline]);

  const pendingMeds = todayTimeline.filter((t) => t.status !== 'taken');
  const currentMed = pendingMeds[0];
  const reminderKey = showReminder && currentMed
    ? `${currentMed.plan.id}:${currentMed.scheduled_time}`
    : null;

  useEffect(() => {
    if (!reminderKey || !currentMed) {
      if (spokenReminderKeyRef.current !== null) {
        stop();
        spokenReminderKeyRef.current = null;
      }
      return;
    }

    if (spokenReminderKeyRef.current === reminderKey) return;
    if (spokenReminderKeyRef.current !== null) stop();

    spokenReminderKeyRef.current = reminderKey;
    void speak(
      `现在该吃药了。${currentMed.plan.medicine_name} ${currentMed.plan.dosage}`,
    );
  }, [currentMed, reminderKey, speak, stop]);

  useEffect(() => () => {
    spokenReminderKeyRef.current = null;
    stop();
  }, [stop]);

  const handleConfirm = async () => {
    if (!currentMed) return;
    stop();
    await confirmMedication(currentMed.plan.id, currentMed.scheduled_time);
    setShowReminder(false);
  };

  const handleDefer = () => {
    stop();
    window.sessionStorage.setItem(
      'medicine-reminder-deferred-until',
      String(Date.now() + 15 * 60 * 1000),
    );
    setShowReminder(false);
  };

  const handleEmergency = async () => {
    setSosMessage('');
    try {
      await fetchApi('/api/v1/emergency/trigger', {
        method: 'POST',
        body: { trigger_method: 'button' },
      });
      setSosMessage('紧急求助已发出');
    } catch (error) {
      setSosMessage(error instanceof Error ? error.message : '求助发送失败，请拨打 120');
    }
  };

  // 提醒视图：单屏 ≤ 2 核心操作
  if (showReminder && currentMed) {
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
            当前用药提醒
          </Card>
          <IconButton
            aria-label="SOS 紧急呼叫"
            className={styles.sosBtn}
            onClick={handleEmergency}
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
            <div className={styles.medicineItem}>
              <div className={`${styles.medicineIcon} ${PILL_COLORS[0]}`}>
                {PILL_ICONS[0]}
              </div>
              <div className={styles.medicineInfo}>
                <div className={styles.medicineName}>{currentMed.plan.medicine_name}</div>
                <div className={styles.medicineDose}>{currentMed.plan.dosage}</div>
              </div>
              <time className={styles.currentTime}>{currentMed.scheduled_time}</time>
            </div>
        </Card>

        {sosMessage && <p className={styles.sosMessage} role="status">{sosMessage}</p>}

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
            onClick={handleDefer}
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
      <PageHeader
        title="用药管家"
        rightAction={
          <IconButton aria-label="查看用药历史" onClick={() => router.push('/medicine/history')}>
            <History size={22} />
          </IconButton>
        }
      />

      <div className={styles.dateNav}>
        <span className={styles.dateNavLabel}>今日计划</span>
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
