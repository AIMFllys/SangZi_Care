'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useHealthStore, formatHealthValue, RECORD_TYPE_CONFIG } from '@/stores/healthStore';
import { User, Heart, Stethoscope, Thermometer, Plus } from 'lucide-react';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import styles from './page.module.css';

export default function HealthPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const latestRecords = useHealthStore((s) => s.latestRecords);
  const loading = useHealthStore((s) => s.loading);
  const error = useHealthStore((s) => s.error);
  const fetchLatest = useHealthStore((s) => s.fetchLatest);

  useEffect(() => {
    if (user?.id) {
      fetchLatest();
    }
  }, [user?.id, fetchLatest]);

  const hr = latestRecords.heart_rate;
  const bp = latestRecords.blood_pressure;
  const heartVal = hr ? formatHealthValue('heart_rate', hr.values) : '72';
  const bpVal = bp ? formatHealthValue('blood_pressure', bp.values) : '128/82';
  const stepsGoal = 5000;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>健康看板</h1>
        <div className={`${styles.avatar} interactive`} onClick={() => router.push('/settings')}><User size={24} /></div>
      </div>

      {/* 今日状态 */}
      <div className={styles.statusCard}>
        <div>
          <div className={styles.statusLabel}>今日状态</div>
          <div className={styles.statusValue}>健康良好</div>
        </div>
        <div>
          <div className={styles.statusLabel}>上次更新</div>
          <div className={styles.statusTimeValue}>
            {bp?.measured_at ? new Date(bp.measured_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </div>
        </div>
      </div>

      <DataStateWrapper
        loading={loading}
        error={error}
        onRetry={() => fetchLatest()}
        empty={Object.values(latestRecords).every((v) => v === null) ? { icon: <Heart size={48} />, title: '暂无健康数据', description: '点击下方按钮添加您的第一条记录' } : false}
      >
        <div className={styles.cards}>
          {/* 心率 */}
          <div className={`glass-card ${styles.healthCard} interactive`}>
            <div className={styles.healthCardHeader}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`${styles.healthCardIcon} ${styles.iconHeart}`}><Heart size={20} color="currentColor" /></div>
                <span className={styles.healthCardLabel}>心率</span>
              </div>
              <span className={`${styles.statusBadge} ${hr?.is_abnormal ? styles.badgeWarning : styles.badgeNormal}`}>
                {hr?.is_abnormal ? '偏高' : '正常范围'}
              </span>
            </div>
            <div>
              <span className={styles.healthValue}>{heartVal}</span>
              <span className={styles.healthUnit}>次/分</span>
            </div>
            <div className={styles.progressBar}>
              <div className={`${styles.progressFill} ${styles.progressFillRed}`} style={{ width: `${Math.min((parseInt(heartVal) / 120) * 100, 100)}%` }} />
            </div>
            <span className={styles.healthCardBg}><Heart size={64} opacity={0.05} /></span>
          </div>

          {/* 血压 */}
          <div className={`glass-card ${styles.healthCard} interactive`}>
            <div className={styles.healthCardHeader}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`${styles.healthCardIcon} ${styles.iconBp}`}><Stethoscope size={20} color="currentColor" /></div>
                <span className={styles.healthCardLabel}>血压</span>
              </div>
              <span className={`${styles.statusBadge} ${bp?.is_abnormal ? styles.badgeWarning : styles.badgeNormal}`}>
                {bp?.is_abnormal ? '偏高' : '正常'}
              </span>
            </div>
            <div>
              <span className={styles.healthValue}>{bpVal}</span>
              <span className={styles.healthUnit}>mmHg</span>
            </div>
            <span className={styles.healthCardBg}><Stethoscope size={64} opacity={0.05} /></span>
          </div>

          {/* 体温 */}
          {latestRecords.temperature && (
            <div className={`glass-card ${styles.healthCard} interactive`}>
              <div className={styles.healthCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className={`${styles.healthCardIcon} ${styles.iconWeight}`}><Thermometer size={20} color="currentColor" /></div>
                  <span className={styles.healthCardLabel}>体温</span>
                </div>
                <span className={`${styles.statusBadge} ${styles.badgeNormal}`}>正常</span>
              </div>
              <div>
                <span className={styles.healthValue}>{formatHealthValue('temperature', latestRecords.temperature.values)}</span>
                <span className={styles.healthUnit}>°C</span>
              </div>
              <span className={styles.healthCardBg}><Thermometer size={64} opacity={0.05} /></span>
            </div>
          )}
        </div>
      </DataStateWrapper>

      <button className={`${styles.addBtn} interactive`} onClick={() => router.push('/health/input')}>
        <Plus size={20} style={{ marginRight: 8 }} /> 添加新记录
      </button>
    </div>
  );
}
