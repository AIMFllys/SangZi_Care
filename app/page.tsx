'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useHealthStore, formatHealthValue } from '@/stores/healthStore';
import { useMedicineStore, calcProgress } from '@/stores/medicineStore';
import { useFamilyBinds } from '@/hooks/useFamilyBinds';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import styles from './page.module.css';

/** 日期格式化 */
function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours().toString().padStart(2, '0');
  const mins = now.getMinutes().toString().padStart(2, '0');
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[now.getDay()];

  return { time: `${hours}:${mins}`, date: `${month}月${day}日 星期${weekday}`, hour: now.getHours() };
}

/** 时段问候语 */
function getGreeting(hour: number): string {
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

/* ==================================================================
 * Elder 端首页 — 大语音球 + 时间卡 + SOS
 * ================================================================== */
function ElderHomeView() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const { time, date, hour } = useCurrentTime();
  const name = user?.name || '您';

  return (
    <div className={styles.page}>
      {/* 问候 */}
      <div className={styles.greeting}>
        <h1 className={styles.greetingText}>
          {getGreeting(hour)}，
          <br />
          {name}
        </h1>
      </div>

      {/* 时间天气卡 */}
      <div className={`glass-card ${styles.timeCard}`}>
        <div>
          <div className={styles.time}>{time}</div>
          <div className={styles.dateText}>{date}</div>
        </div>
        <div className={styles.weather}>
          <span className={styles.weatherIcon}>☀️</span>
          <span className={styles.weatherTemp}>24° 晴</span>
        </div>
      </div>

      {/* 语音球 */}
      <div className={styles.voiceSection}>
        <div
          className={styles.voiceBallWrapper}
          onClick={() => router.push('/voice')}
          role="button"
          aria-label="点我说话，开启语音助手"
        >
          <div className={styles.voiceBallRing} />
          <div className={styles.voiceBallRing} />
          <div className={`${styles.voiceBall} interactive`}>
            <span className={styles.voiceIcon}>🎙️</span>
          </div>
        </div>
        <p className={styles.voiceLabel}>点我说话</p>
      </div>

      {/* 上滑提示 */}
      <div className={styles.swipeHint}>
        <span className={styles.swipeArrow}>⌃</span>
        <span>上滑更多功能</span>
      </div>

      {/* 紧急呼叫 */}
      <button
        className={styles.sosButton}
        onClick={() => router.push('/settings')}
        aria-label="紧急呼叫 SOS"
      >
        <span className={styles.sosIcon}>🆘</span>
        紧急呼叫 (SOS)
      </button>
    </div>
  );
}

/* ==================================================================
 * Family 端首页 — 家人看板
 * ================================================================== */
function FamilyHomeView() {
  const router = useRouter();
  const { binds, isLoading: bindsLoading } = useFamilyBinds();
  const latestRecords = useHealthStore((s) => s.latestRecords);
  const fetchLatest = useHealthStore((s) => s.fetchLatest);
  const todayTimeline = useMedicineStore((s) => s.todayTimeline);
  const fetchTodayTimeline = useMedicineStore((s) => s.fetchTodayTimeline);
  const [selectedElder, setSelectedElder] = useState(0);

  const elder = binds[selectedElder];

  useEffect(() => {
    if (elder) {
      fetchLatest();
      fetchTodayTimeline();
    }
  }, [elder, fetchLatest, fetchTodayTimeline]);

  const medicineTotal = todayTimeline.length;
  const medicineDone = todayTimeline.filter((t) => t.status === 'taken').length;

  const bp = latestRecords.blood_pressure;
  const bpDisplay = bp ? formatHealthValue('blood_pressure', bp.values) : '128/82';

  // 模拟7天趋势数据
  const trendData = [65, 72, 68, 75, 70, 82, 72];
  const maxTrend = Math.max(...trendData);

  return (
    <div className={styles.familyPage}>
      {/* 头部 */}
      <div className={styles.familyHeader}>
        <h1 className={styles.familyTitle}>家人看板</h1>
        <div className={`glass-card ${styles.notifIcon} interactive`}>🔔</div>
      </div>

      {/* 老人选择 tabs */}
      <div className={styles.elderTabs}>
        {binds.map((bind, i) => (
          <button
            key={bind.user.id}
            className={`${styles.elderTab} ${i === selectedElder ? styles.elderTabActive : ''}`}
            onClick={() => setSelectedElder(i)}
          >
            <span className={styles.elderTabAvatar}>👤</span>
            {bind.user.name || bind.bind.relation || '家人'}
          </button>
        ))}
        <button className={styles.elderTab} onClick={() => router.push('/settings/bind')}>
          +
        </button>
      </div>

      <DataStateWrapper loading={bindsLoading} empty={binds.length === 0 ? { icon: '👨‍👩‍👧', title: '还没有绑定家人', description: '去设置页面添加您的家人吧' } : false}>
        {/* 摘要卡片 */}
        <div className={styles.summaryGrid}>
          <div className={`glass-card ${styles.summaryCard} interactive`} onClick={() => router.push('/medicine')}>
            <span className={styles.summaryIcon}>💊</span>
            <span className={styles.summaryLabel}>今日用药</span>
            <span className={styles.summaryValue}>{medicineDone}<span style={{ fontSize: 'var(--font-body)', fontWeight: 400 }}> / {medicineTotal}</span></span>
            <span className={styles.summaryMeta}>{medicineDone >= medicineTotal && medicineTotal > 0 ? '✅ 全部完成' : `还有 ${medicineTotal - medicineDone} 次`}</span>
            <span className={styles.summaryBgIcon}>💊</span>
          </div>
          <div className={`glass-card ${styles.summaryCard} interactive`} onClick={() => router.push('/health')}>
            <span className={styles.summaryIcon}>📍</span>
            <span className={styles.summaryLabel}>当前状态</span>
            <span className={styles.summaryValue} style={{ fontSize: 'var(--font-heading)' }}>在家休息</span>
            <span className={styles.summaryMeta} style={{ color: 'var(--text-muted)' }}>更新于 10分钟前</span>
            <span className={styles.summaryBgIcon}>🏠</span>
          </div>
        </div>

        {/* 健康趋势 */}
        <div className={`glass-card ${styles.trendSection}`}>
          <div className={styles.trendHeader}>
            <h2 className={styles.trendTitle}>
              <span className={styles.trendTitleAccent} />
              健康趋势 (心率)
            </h2>
            <button className={styles.trendLink} onClick={() => router.push('/health')}>详细 →</button>
          </div>

          <div className={styles.trendChart}>
            {trendData.map((val, i) => (
              <div
                key={i}
                className={`${styles.trendBar} ${i === trendData.length - 1 ? styles.trendBarActive : ''} ${val > 80 ? styles.trendBarDanger : ''}`}
                style={{ height: `${(val / maxTrend) * 100}%` }}
              />
            ))}
          </div>
          <div className={styles.trendLabels}>
            {['周一', '周二', '周三', '周四', '周五', '昨天', '今天'].map((d, i) => (
              <span key={d} className={`${styles.trendDayLabel} ${i === 6 ? styles.trendDayActive : ''}`}>{d}</span>
            ))}
          </div>

          {/* 警告 */}
          {bp?.is_abnormal && (
            <div className={styles.alertBanner}>
              <span className={styles.alertIcon}>⚠️</span>
              <div>
                <div className={styles.alertTitle}>血压偏高</div>
                <div className={styles.alertDesc}>
                  最近测量值为 {bpDisplay} mmHg，建议今晚再次测量并保持关注。
                </div>
              </div>
            </div>
          )}
        </div>
      </DataStateWrapper>
    </div>
  );
}

/* ==================================================================
 * 主页面入口
 * ================================================================== */
export default function HomePage() {
  const user = useUserStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;

  return user.role === 'family' ? <FamilyHomeView /> : <ElderHomeView />;
}
