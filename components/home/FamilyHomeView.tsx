'use client';

import { useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  ChevronRight,
  HeartPulse,
  LockKeyhole,
  Pill,
  Plus,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useCareRecipient } from '@/hooks/useCareRecipient';
import { useCareDashboard } from '@/hooks/useCareDashboard';
import { formatHealthValue } from '@/stores/healthStore';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import PageHeader from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { CareRecipientTabs } from '@/components/family/CareRecipientTabs';
import { AdherenceMiniChart } from '@/components/family/AdherenceMiniChart';
import { HealthSparkline } from '@/components/family/HealthSparkline';
import styles from '../../app/page.module.css';

export default function FamilyHomeView() {
  const router = useRouter();
  const {
    recipient,
    recipients,
    targetUserId,
    isLoading: recipientsLoading,
    error: recipientsError,
    retry: retryRecipients,
  } = useCareRecipient();
  const {
    data,
    loading,
    error: dashboardError,
    retry: retryDashboard,
  } = useCareDashboard(targetUserId);

  const bloodPressure = data?.latestVitals.blood_pressure;
  const heartRate = data?.latestVitals.heart_rate;
  const bloodPressureValue = bloodPressure
    ? formatHealthValue('blood_pressure', bloodPressure.values)
    : '--';
  const heartRateValue = heartRate
    ? formatHealthValue('heart_rate', heartRate.values)
    : '--';
  const updatedTime = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    : '--:--';

  return (
    <div className={styles.familyPage}>
      <PageHeader
        title="照护看板"
        subtitle={recipient ? `正在照护 · ${recipient.name}` : '家属监护端'}
        rightAction={
          <IconButton
            aria-label="查看版本通知"
            variant="soft"
            size="md"
            onClick={() => router.push('/notifications')}
          >
            <Bell size={21} />
          </IconButton>
        }
        transparent
      />

      <CareRecipientTabs showAdd />

      <DataStateWrapper
        loading={recipientsLoading || loading}
        error={recipientsError ?? dashboardError}
        onRetry={recipientsError ? retryRecipients : retryDashboard}
        empty={recipients.length === 0 ? {
          icon: <Users size={44} />,
          title: '还没有照护长辈',
          description: '使用长辈提供的绑定码建立监护关系',
          action: {
            label: '去绑定长辈',
            onClick: () => router.push('/settings/bind'),
          },
        } : false}
      >
        {data && recipient && (
          <div className={styles.familyContent}>
            <section className={styles.summaryGrid} aria-label="关键照护指标">
              <Card
                variant="glass"
                className={styles.summaryCard}
                onClick={data.access.medication ? () => router.push('/medicine') : undefined}
              >
                <span className={styles.summaryIcon}><Pill size={22} /></span>
                <span className={styles.summaryLabel}>今日用药</span>
                <span className={styles.summaryValue}>
                  {data.access.medication ? data.todayMedication.completed : '--'}
                  {data.access.medication && (
                    <span className={styles.summaryValueUnit}>
                      {' '}/ {data.todayMedication.total} 次
                    </span>
                  )}
                </span>
                <span className={styles.summaryMeta}>
                  {!data.access.medication
                    ? '长辈尚未授权查看用药'
                    : data.todayMedication.total === 0
                    ? '今日没有计划'
                    : `${data.todayMedication.rate}% 已完成`}
                </span>
                <span className={styles.summaryBgIcon}><Pill size={60} /></span>
              </Card>

              <Card variant="glass" className={styles.summaryCard}>
                <span className={styles.summaryIcon}><ShieldCheck size={22} /></span>
                <span className={styles.summaryLabel}>7 日依从率</span>
                <span className={styles.summaryValue}>
                  {data.access.medication ? `${data.adherence7d}%` : '--'}
                </span>
                <span className={styles.summaryMeta}>
                  {!data.access.medication
                    ? '长辈尚未授权查看用药'
                    : data.adherence7d >= 80
                      ? '照护节奏稳定'
                      : '仍有计划待关注'}
                </span>
                <span className={styles.summaryBgIcon}><ShieldCheck size={60} /></span>
              </Card>
            </section>

            <section className={styles.vitalsStrip} aria-label="最新健康指标">
              <button
                type="button"
                disabled={!data.access.health}
                onClick={() => router.push('/health')}
              >
                <span className={styles.vitalIcon}><Activity size={18} /></span>
                <span><small>血压</small><strong>{data.access.health ? bloodPressureValue : '--'}</strong></span>
                <em>mmHg</em>
              </button>
              <button
                type="button"
                disabled={!data.access.health}
                onClick={() => router.push('/health')}
              >
                <span className={styles.vitalIcon}><HeartPulse size={18} /></span>
                <span><small>心率</small><strong>{data.access.health ? heartRateValue : '--'}</strong></span>
                <em>次/分</em>
              </button>
              <button
                type="button"
                disabled={!data.access.health}
                className={data.abnormalCount7d > 0 ? styles.vitalWarning : ''}
                onClick={() => router.push('/health')}
              >
                <span className={styles.vitalIcon}><TriangleAlert size={18} /></span>
                <span><small>7 日异常</small><strong>{data.access.health ? data.abnormalCount7d : '--'}</strong></span>
                <em>次</em>
              </button>
            </section>

            <section className={styles.dashboardCharts} aria-label="照护趋势图">
              <Card variant="glass" className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <span className={styles.chartEyebrow}>MEDICATION</span>
                    <h2>每日用药完成</h2>
                  </div>
                  <button type="button" onClick={() => router.push('/medicine')}>
                    管理 <ChevronRight size={15} />
                  </button>
                </div>
                {data.access.medication ? (
                  <AdherenceMiniChart points={data.medicationAdherence} />
                ) : (
                  <div className={styles.chartLocked} role="status">
                    <LockKeyhole size={20} /> 长辈尚未授权查看用药
                  </div>
                )}
              </Card>

              <Card variant="glass" className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <span className={styles.chartEyebrow}>HEART RATE</span>
                    <h2>近七日心率</h2>
                  </div>
                  <span className={styles.updatedAt}>更新 {updatedTime}</span>
                </div>
                {data.access.health ? (
                  <HealthSparkline points={data.heartRateTrend} />
                ) : (
                  <div className={styles.chartLocked} role="status">
                    <LockKeyhole size={20} /> 长辈尚未授权查看健康
                  </div>
                )}
              </Card>
            </section>

            <section className={styles.careActions} aria-label="快捷照护操作">
              <button
                type="button"
                disabled={!recipient.permissions.canEditHealth}
                onClick={() => router.push('/health/input')}
              >
                <span><Plus size={18} /></span>
                <strong>代录健康</strong>
                <small>
                  {recipient.permissions.canEditHealth ? '血压、心率等' : '长辈尚未授权'}
                </small>
              </button>
              <button
                type="button"
                disabled={!recipient.permissions.canEditMedication}
                onClick={() => router.push('/medicine')}
              >
                <span><Pill size={18} /></span>
                <strong>设置用药</strong>
                <small>
                  {recipient.permissions.canEditMedication ? '计划与提醒' : '长辈尚未授权'}
                </small>
              </button>
            </section>
          </div>
        )}
      </DataStateWrapper>
    </div>
  );
}
