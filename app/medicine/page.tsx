'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useMedicineStore,
  type MedicationPlanResponse,
  type TodayTimelineItem,
} from '@/stores/medicineStore';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useCareRecipient } from '@/hooks/useCareRecipient';
import { useEmergencyTrigger } from '@/hooks/useEmergencyTrigger';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import { Badge, Button, Card, IconButton } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import { CareRecipientTabs } from '@/components/family/CareRecipientTabs';
import { PlanForm } from '@/components/medicine/PlanForm';
import {
  CalendarClock,
  CheckCircle,
  Clock,
  Edit3,
  History,
  Pill,
  Plus,
  Syringe,
  Tablets,
  TestTube,
  Timer,
} from 'lucide-react';
import styles from './page.module.css';

const PILL_COLORS = [
  styles.medicineIconInfo,
  styles.medicineIconDanger,
  styles.medicineIconWarning,
  styles.medicineIconSuccess,
];
const PILL_ICONS = [Pill, Tablets, TestTube, Syringe];
const EMPTY_TIMELINE: TodayTimelineItem[] = [];
const EMPTY_PLANS: MedicationPlanResponse[] = [];
const REMINDER_DEFER_PREFIX = 'medicine-reminder-deferred-until';
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

interface ReminderCandidate {
  item: TodayTimelineItem;
  key: string;
  storageKey: string;
  triggerAt: number;
}

function createReminderKey(targetUserId: string, item: TodayTimelineItem) {
  return `${targetUserId}:${item.plan.id}:${item.scheduled_at}`;
}

function createReminderStorageKey(targetUserId: string, item: TodayTimelineItem) {
  return [
    REMINDER_DEFER_PREFIX,
    encodeURIComponent(targetUserId),
    encodeURIComponent(item.plan.id),
    encodeURIComponent(item.scheduled_at),
  ].join(':');
}

function millisecondsUntilNextShanghaiMidnight(timestamp: number) {
  const shanghaiTimestamp = timestamp + SHANGHAI_OFFSET_MS;
  const nextDay = (Math.floor(shanghaiTimestamp / DAY_MS) + 1) * DAY_MS;
  return Math.max(1, nextDay - shanghaiTimestamp);
}

export default function MedicinePage() {
  const router = useRouter();
  const {
    recipient,
    targetUserId,
    isSelf,
    isFamily,
    isLoading: recipientLoading,
    error: recipientError,
    retry: retryRecipients,
  } = useCareRecipient();
  const todayTimeline = useMedicineStore((state) => state.todayTimeline);
  const plans = useMedicineStore((state) => state.plans);
  const timelineTargetKey = useMedicineStore((state) => state.timelineTargetKey);
  const plansTargetKey = useMedicineStore((state) => state.plansTargetKey);
  const isLoading = useMedicineStore((state) => state.isLoading);
  const error = useMedicineStore((state) => state.error);
  const fetchTodayTimeline = useMedicineStore((state) => state.fetchTodayTimeline);
  const fetchAllPlans = useMedicineStore((state) => state.fetchAllPlans);
  const confirmMedication = useMedicineStore((state) => state.confirmMedication);
  const { speak, stop } = useTextToSpeech();
  const spokenReminderKeyRef = useRef<string | null>(null);

  const [now, setNow] = useState(0);
  const [deferredReminders, setDeferredReminders] = useState<{
    signature: string;
    untilByKey: Record<string, number>;
  }>({
    signature: '',
    untilByKey: {},
  });
  const [dismissedReminderKeys, setDismissedReminderKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [actionError, setActionError] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const { trigger: triggerEmergency, isLoading: sosLoading, feedback: sosFeedback } =
    useEmergencyTrigger();

  const canManageMedication = Boolean(recipient?.permissions.canEditMedication);
  const timelineMatchesTarget = Boolean(
    targetUserId && timelineTargetKey === targetUserId,
  );
  const plansMatchTarget = Boolean(
    targetUserId && plansTargetKey === targetUserId,
  );
  const visibleTimeline = timelineMatchesTarget ? todayTimeline : EMPTY_TIMELINE;
  const visiblePlans = plansMatchTarget ? plans : EMPTY_PLANS;
  const editingPlan = visiblePlans.find((plan) => plan.id === editingPlanId);

  useEffect(() => {
    if (!targetUserId) return;
    void Promise.all([
      fetchTodayTimeline(targetUserId),
      fetchAllPlans(targetUserId),
    ]);
  }, [fetchAllPlans, fetchTodayTimeline, targetUserId]);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!targetUserId) return;

    let midnightTimer: number | undefined;
    const refresh = () => Promise.all([
      fetchTodayTimeline(targetUserId),
      fetchAllPlans(targetUserId),
    ]);
    const scheduleMidnightRefresh = () => {
      midnightTimer = window.setTimeout(() => {
        setNow(Date.now());
        void refresh();
        scheduleMidnightRefresh();
      }, millisecondsUntilNextShanghaiMidnight(Date.now()));
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(Date.now());
      void refresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleMidnightRefresh();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
    };
  }, [fetchAllPlans, fetchTodayTimeline, targetUserId]);

  const reminderCandidates = useMemo<ReminderCandidate[]>(() => {
    // 只有长辈本人设备触发全屏提醒与朗读，家属端仅做远程配置/查看。
    if (!isSelf || !targetUserId) return [];
    return visibleTimeline.flatMap((item) => {
      if (
        (item.status !== 'pending' && item.status !== 'delayed')
        || item.plan.remind_enabled === false
      ) return [];

      const scheduledAt = new Date(item.scheduled_at).getTime();
      if (!Number.isFinite(scheduledAt)) return [];
      const configuredMinutes = Number(item.plan.remind_before_minutes ?? 0);
      const remindBefore = Number.isFinite(configuredMinutes)
        ? Math.max(0, configuredMinutes) * 60_000
        : 0;
      return [{
        item,
        key: createReminderKey(targetUserId, item),
        storageKey: createReminderStorageKey(targetUserId, item),
        triggerAt: scheduledAt - remindBefore,
      }];
    });
  }, [isSelf, targetUserId, visibleTimeline]);

  const candidateSignature = useMemo(
    () => reminderCandidates.map((candidate) => candidate.key).join('|'),
    [reminderCandidates],
  );

  useEffect(() => {
    const untilByKey: Record<string, number> = {};
    const timestamp = Date.now();
    for (const candidate of reminderCandidates) {
      try {
        const storedValue = window.sessionStorage.getItem(candidate.storageKey);
        const deferredUntil = Number(storedValue);
        if (storedValue !== null && Number.isFinite(deferredUntil) && deferredUntil > timestamp) {
          untilByKey[candidate.key] = deferredUntil;
        } else if (storedValue !== null) {
          window.sessionStorage.removeItem(candidate.storageKey);
        }
      } catch {
        // WebView 禁用存储时仍保留当前会话内的提醒能力。
      }
    }
    setDeferredReminders({ signature: candidateSignature, untilByKey });
  }, [candidateSignature, reminderCandidates]);

  const remindersReady = now > 0 && deferredReminders.signature === candidateSignature;
  const currentCandidate = remindersReady
    ? reminderCandidates.find((candidate) => (
      !dismissedReminderKeys.has(candidate.key)
      && candidate.triggerAt <= now
      && (deferredReminders.untilByKey[candidate.key] ?? 0) <= now
    ))
    : undefined;
  const currentMed = currentCandidate?.item;
  const reminderKey = currentCandidate?.key ?? null;

  const nextReminderBoundary = remindersReady
    ? reminderCandidates.reduce<number | null>((nearest, candidate) => {
      if (dismissedReminderKeys.has(candidate.key)) return nearest;
      const availableAt = Math.max(
        candidate.triggerAt,
        deferredReminders.untilByKey[candidate.key] ?? 0,
      );
      if (availableAt <= now) return nearest;
      return nearest === null ? availableAt : Math.min(nearest, availableAt);
    }, null)
    : null;

  useEffect(() => {
    if (nextReminderBoundary === null) return;
    const delay = Math.min(
      Math.max(0, nextReminderBoundary - Date.now()),
      MAX_TIMEOUT_MS,
    );
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [nextReminderBoundary]);

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

  const confirmItem = async (item: TodayTimelineItem) => {
    stop();
    setActionError('');
    const confirmedReminderKey = targetUserId
      ? createReminderKey(targetUserId, item)
      : null;
    try {
      await confirmMedication(item.plan.id, item.scheduled_at);
      if (confirmedReminderKey) {
        setDismissedReminderKeys((previous) => {
          const next = new Set(previous);
          next.add(confirmedReminderKey);
          return next;
        });
      }
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '记录服药失败，请重试');
    }
  };

  const handleDefer = () => {
    if (!currentCandidate) return;
    stop();
    const timestamp = Date.now();
    const deferredUntil = timestamp + FIFTEEN_MINUTES_MS;
    try {
      window.sessionStorage.setItem(
        currentCandidate.storageKey,
        String(deferredUntil),
      );
    } catch {
      // WebView 禁用存储时仍通过 React 状态完成本次延后。
    }
    setDeferredReminders((previous) => ({
      signature: candidateSignature,
      untilByKey: {
        ...(previous.signature === candidateSignature ? previous.untilByKey : {}),
        [currentCandidate.key]: deferredUntil,
      },
    }));
    setNow(timestamp);
  };

  const refreshPlans = async () => {
    setShowPlanForm(false);
    setEditingPlanId(null);
    if (!targetUserId) return;
    await Promise.all([
      fetchTodayTimeline(targetUserId),
      fetchAllPlans(targetUserId),
    ]);
  };

  if (currentMed) {
    return (
      <div className={`${styles.page} ${styles.reminderPage}`}>
        <div className={styles.topBar}>
          <Card variant="glass" className={styles.voiceIndicator}>
            <div className={styles.voiceBars} aria-hidden="true">
              <div className={styles.bar} />
              <div className={styles.bar} />
              <div className={styles.bar} />
              <div className={styles.bar} />
            </div>
            当前用药提醒
          </Card>
          {isSelf && (
            <IconButton
              aria-label="SOS 紧急呼叫"
              className={styles.sosBtn}
              onClick={() => void triggerEmergency()}
              disabled={sosLoading}
              aria-busy={sosLoading}
            >
              <span className={styles.sosText}>SOS</span>
            </IconButton>
          )}
        </div>

        <div className={styles.heroSection}>
          <div className={styles.pillIconWrapper}>
            <div className={styles.pillIconInner}>
              <Pill size={48} />
              <Tablets size={48} />
            </div>
          </div>
          <h1 className={styles.heroTitle}>该吃药啦！</h1>
          <p className={styles.heroSubtitle}>请按计划服用药物</p>
        </div>

        <div className={styles.reminderBody}>
          <Card variant="solid" className={styles.medicineCard}>
            <div className={styles.medicineItem}>
              <div className={`${styles.medicineIcon} ${PILL_COLORS[0]}`}>
                <Pill size={24} />
              </div>
              <div className={styles.medicineInfo}>
                <div className={styles.medicineName}>{currentMed.plan.medicine_name}</div>
                <div className={styles.medicineDose}>{currentMed.plan.dosage}</div>
              </div>
              <time className={styles.currentTime}>{currentMed.scheduled_time}</time>
            </div>
          </Card>

          {isSelf && sosLoading && (
            <p className={styles.sosMessage} role="status">
              正在发送紧急求助…
            </p>
          )}
          {isSelf && sosFeedback && (
            <p
              className={styles.sosMessage}
              role={sosFeedback.kind === 'error' ? 'alert' : 'status'}
            >
              {sosFeedback.message}
            </p>
          )}
          {actionError && <p className={styles.sosMessage} role="alert">{actionError}</p>}

          <div className={styles.actions}>
            <Button
              variant="success"
              size="lg"
              fullWidth
              leftIcon={<CheckCircle size={20} />}
              onClick={() => void confirmItem(currentMed)}
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
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={isFamily && recipient ? `${recipient.name}的用药` : '用药管家'}
        subtitle={isFamily ? '远程设置计划，不在家属设备播报' : undefined}
        rightAction={
          <IconButton
            aria-label="查看用药历史"
            onClick={() => router.push('/medicine/history')}
          >
            <History size={21} />
          </IconButton>
        }
      />

      <div className={styles.recipientRow}>
        <CareRecipientTabs className={styles.recipientTabs} />
      </div>

      <div className={styles.dateNav}>
        <div>
          <span className={styles.dateNavLabel}>今日计划</span>
          <small>{visibleTimeline.filter((item) => item.status === 'taken').length}/{visibleTimeline.length} 已完成</small>
        </div>
        <Button
          variant="soft"
          size="sm"
          leftIcon={<Plus size={16} />}
          disabled={!targetUserId || !canManageMedication}
          onClick={() => {
            setEditingPlanId(null);
            setShowPlanForm(true);
          }}
        >
          新增计划
        </Button>
      </div>

      <DataStateWrapper
        loading={recipientLoading || Boolean(
          targetUserId && (!timelineMatchesTarget || !plansMatchTarget || isLoading),
        )}
        error={recipientError ?? (
          timelineMatchesTarget && plansMatchTarget ? error : null
        )}
        empty={!targetUserId ? {
          icon: <Pill size={44} />,
          title: '请先选择照护长辈',
          description: '家属端只管理已绑定长辈的用药计划',
        } : false}
        onRetry={recipientError
          ? retryRecipients
          : () => targetUserId && void Promise.all([
            fetchTodayTimeline(targetUserId),
            fetchAllPlans(targetUserId),
          ])}
      >
        <main className={styles.timelineScroller}>
          {actionError && <p className={styles.inlineError} role="alert">{actionError}</p>}

          <section className={styles.timeline} aria-label="今日用药时间线">
            {visibleTimeline.length === 0 && (
              <Card variant="glass" className={styles.emptyTimeline}>
                <CalendarClock size={34} aria-hidden="true" />
                <div>
                  <strong>今天没有用药计划</strong>
                  <span>可在下方管理长期计划与提醒</span>
                </div>
              </Card>
            )}
            {visibleTimeline.map((item, index) => {
              const Icon = PILL_ICONS[index % PILL_ICONS.length];
              const canConfirm = item.status === 'pending' || item.status === 'delayed';
              return (
                <Card
                  key={`${item.plan.id}-${item.scheduled_at}`}
                  variant="glass"
                  className={styles.timeSlot}
                >
                  <span className={styles.timeSlotWatermark} aria-hidden="true">
                    <Icon size={64} />
                  </span>
                  <span className={`${styles.medicineIcon} ${PILL_COLORS[index % PILL_COLORS.length]}`}>
                    <Icon size={20} />
                  </span>
                  <time className={styles.timeSlotTime}>{item.scheduled_time}</time>
                  <span className={styles.timeSlotMed}>
                    {item.plan.medicine_name} · {item.plan.dosage}
                  </span>
                  <span className={styles.timeSlotStatus}>
                    {item.status === 'taken'
                      ? <Badge variant="success">已服用</Badge>
                      : canConfirm && (isSelf || canManageMedication)
                        ? (
                          <button
                            type="button"
                            onClick={() => void confirmItem(item)}
                          >
                            {isFamily ? '代确认已服' : '确认服用'}
                          </button>
                        )
                        : <Timer size={19} color="var(--text-muted)" />}
                  </span>
                </Card>
              );
            })}
          </section>

          <section className={styles.planSection} aria-label="用药计划管理">
            <div className={styles.sectionHeader}>
              <div>
                <span>PLAN</span>
                <h2>计划管理</h2>
              </div>
              {!canManageMedication && isFamily && <small>长辈尚未授权编辑</small>}
            </div>
            <div className={styles.planList}>
              {visiblePlans.map((plan) => (
                <Card key={plan.id} variant="solid" className={styles.planCard}>
                  <span className={styles.planIcon}><Pill size={19} /></span>
                  <span className={styles.planCopy}>
                    <strong>{plan.medicine_name}</strong>
                    <small>{plan.schedule_times.join(' · ')}　{plan.dosage}</small>
                  </span>
                  <Badge variant={plan.is_active ? 'success' : 'normal'}>
                    {plan.is_active ? '进行中' : '已停用'}
                  </Badge>
                  {canManageMedication && (
                    <button
                      type="button"
                      className={styles.editPlanButton}
                      aria-label={`编辑${plan.medicine_name}计划`}
                      onClick={() => {
                        setEditingPlanId(plan.id);
                        setShowPlanForm(true);
                      }}
                    >
                      <Edit3 size={17} />
                    </button>
                  )}
                </Card>
              ))}
            </div>
          </section>
        </main>
      </DataStateWrapper>

      {showPlanForm && targetUserId && (
        <PlanForm
          elderId={targetUserId}
          plan={editingPlan}
          onSuccess={() => void refreshPlans()}
          onCancel={() => {
            setShowPlanForm(false);
            setEditingPlanId(null);
          }}
        />
      )}
    </div>
  );
}
