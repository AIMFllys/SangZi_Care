'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthStore, formatHealthValue } from '@/stores/healthStore';
import { useMedicineStore } from '@/stores/medicineStore';
import { useFamilyBinds } from '@/hooks/useFamilyBinds';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import PageHeader from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Bell, User, Users, Pill, MapPin, Home, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import styles from '../../app/page.module.css';

/**
 * Family 端首页 — 家人看板
 */
export default function FamilyHomeView() {
  const router = useRouter();
  const { binds, isLoading: bindsLoading } = useFamilyBinds();
  const latestRecords = useHealthStore((s) => s.latestRecords);
  const fetchLatest = useHealthStore((s) => s.fetchLatest);
  const trendData = useHealthStore((s) => s.trendData);
  const fetchTrend = useHealthStore((s) => s.fetchTrend);
  const todayTimeline = useMedicineStore((s) => s.todayTimeline);
  const fetchTodayTimeline = useMedicineStore((s) => s.fetchTodayTimeline);
  const [selectedElder, setSelectedElder] = useState(0);

  const elder = binds[selectedElder];

  useEffect(() => {
    if (elder) {
      fetchLatest();
      fetchTodayTimeline();
      fetchTrend('heart_rate', 7);
    }
  }, [elder, fetchLatest, fetchTodayTimeline, fetchTrend]);

  const medicineTotal = todayTimeline.length;
  const medicineDone = todayTimeline.filter((t) => t.status === 'taken').length;

  const bp = latestRecords.blood_pressure;
  const bpDisplay = bp ? formatHealthValue('blood_pressure', bp.values) : '--';

  // 从真实趋势数据中提取心率值
  const heartRateValues = trendData.length > 0
    ? trendData.map((r) => {
        const vals = r.values;
        if ('value' in vals && typeof vals.value === 'number') return vals.value;
        return 0;
      })
    : [];
  const maxTrend = heartRateValues.length > 0 ? Math.max(...heartRateValues) : 1;
  const hasTrendData = heartRateValues.length > 0 && heartRateValues.some((v) => v > 0);

  // 生成日期标签
  const dayLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (i === 0) dayLabels.push('今天');
    else if (i === 1) dayLabels.push('昨天');
    else dayLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }

  return (
    <div className={styles.familyPage}>
      {/* 头部 */}
      <PageHeader
        title="家人看板"
        rightAction={
          <IconButton
            aria-label="查看消息通知"
            variant="soft"
            size="md"
            onClick={() => router.push('/messages')}
          >
            <Bell size={22} />
          </IconButton>
        }
        transparent
      />

      {/* 老人选择 tabs */}
      <div className={styles.elderTabs}>
        {binds.map((bind, i) => (
          <button
            key={bind.user.id}
            type="button"
            className={`${styles.elderTab} ${i === selectedElder ? styles.elderTabActive : ''}`}
            onClick={() => setSelectedElder(i)}
          >
            <span className={styles.elderTabAvatar}>
              <User size={20} />
            </span>
            <span className={styles.elderTabLabel}>{bind.user.name || bind.bind.relation || '家人'}</span>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.elderTab} ${styles.elderTabAdd}`}
          onClick={() => router.push('/settings/bind')}
          aria-label="添加家人"
        >
          <Plus size={20} />
        </button>
      </div>

      <DataStateWrapper loading={bindsLoading} empty={binds.length === 0 ? { icon: <Users size={48} />, title: '还没有绑定家人', description: '去设置页面添加您的家人吧' } : false}>
        <div className={styles.familyContent}>
        {/* 摘要卡片 */}
        <div className={styles.summaryGrid}>
          <Card variant="glass" className={styles.summaryCard} onClick={() => router.push('/medicine')}>
            <span className={styles.summaryIcon}><Pill size={24} /></span>
            <span className={styles.summaryLabel}>今日用药</span>
            <span className={styles.summaryValue}>{medicineDone}<span className={styles.summaryValueUnit}> / {medicineTotal}</span></span>
            <span className={styles.summaryMeta}>
              {medicineDone >= medicineTotal && medicineTotal > 0
                ? <><CheckCircle size={16} /> 全部完成</>
                : `还有 ${medicineTotal - medicineDone} 次`}
            </span>
            <span className={styles.summaryBgIcon}><Pill size={56} /></span>
          </Card>
          <Card variant="glass" className={styles.summaryCard} onClick={() => router.push('/health')}>
            <span className={styles.summaryIcon}><MapPin size={24} /></span>
            <span className={styles.summaryLabel}>当前状态</span>
            <span className={styles.summaryValue}>在家休息</span>
            <span className={styles.summaryMeta}>更新于 10分钟前</span>
            <span className={styles.summaryBgIcon}><Home size={56} /></span>
          </Card>
        </div>

        {/* 健康趋势 */}
        <Card variant="glass" className={styles.trendSection}>
          <div className={styles.trendHeader}>
            <h2 className={styles.trendTitle}>
              <span className={styles.trendTitleAccent} />
              健康趋势 (心率)
            </h2>
            <button type="button" className={styles.trendLink} onClick={() => router.push('/health')}>详细 →</button>
          </div>

          {hasTrendData ? (
            <>
              <div className={styles.trendChart}>
                {heartRateValues.map((val, i) => (
                  <div
                    key={i}
                    className={`${styles.trendBar} ${i === heartRateValues.length - 1 ? styles.trendBarActive : ''} ${val > 80 ? styles.trendBarDanger : ''}`}
                    style={{ height: `${(val / maxTrend) * 100}%` }}
                  />
                ))}
              </div>
              <div className={styles.trendLabels}>
                {dayLabels.slice(0, heartRateValues.length).map((d, i) => (
                  <span key={d} className={`${styles.trendDayLabel} ${i === heartRateValues.length - 1 ? styles.trendDayActive : ''}`}>{d}</span>
                ))}
              </div>
            </>
          ) : (
            <p className={styles.trendEmpty}>
              暂无趋势数据，请先录入健康记录
            </p>
          )}

          {/* 警告 */}
          {bp?.is_abnormal && (
            <div className={styles.alertBanner}>
              <span className={styles.alertIcon}><AlertCircle size={24} /></span>
              <div>
                <div className={styles.alertTitle}>血压偏高</div>
                <div className={styles.alertDesc}>
                  最近测量值为 {bpDisplay} mmHg，建议今晚再次测量并保持关注。
                </div>
              </div>
            </div>
          )}
        </Card>
        </div>
      </DataStateWrapper>
    </div>
  );
}
