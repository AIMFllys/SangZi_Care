'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useHealthStore, formatHealthValue } from '@/stores/healthStore';
import { Heart, Stethoscope, Thermometer, Plus, User } from 'lucide-react';
import { Button, Card, Badge, IconButton } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
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
  const temp = latestRecords.temperature;
  const heartVal = hr ? formatHealthValue('heart_rate', hr.values) : '--';
  const bpVal = bp ? formatHealthValue('blood_pressure', bp.values) : '--';

  const lastUpdate = bp?.measured_at
    ? new Date(bp.measured_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <div className={styles.page}>
      <PageHeader
        title="健康看板"
        rightAction={
          <IconButton
            variant="soft"
            aria-label="前往设置"
            onClick={() => router.push('/settings')}
          >
            <User size={24} />
          </IconButton>
        }
      />

      {/* 今日状态 */}
      <Card variant="glass" className={styles.statusCard}>
        <div>
          <div className={styles.statusLabel}>今日状态</div>
          <div className={styles.statusValue}>健康良好</div>
        </div>
        <div className={styles.statusTimeGroup}>
          <div className={styles.statusLabel}>上次更新</div>
          <div className={styles.statusTimeValue}>{lastUpdate}</div>
        </div>
      </Card>

      <DataStateWrapper
        loading={loading}
        error={error}
        onRetry={() => fetchLatest()}
        empty={Object.values(latestRecords).every((v) => v === null) ? { icon: <Heart size={48} />, title: '暂无健康数据', description: '点击下方按钮添加您的第一条记录' } : false}
      >
        <div className={styles.cards}>
          {/* 心率 */}
          <Card variant="glass" className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardTitle}>
                <div className={`${styles.healthCardIcon} ${styles.iconHeart}`}>
                  <Heart size={20} />
                </div>
                <span className={styles.healthCardLabel}>心率</span>
              </div>
              <Badge variant={hr?.is_abnormal ? 'warning' : 'normal'}>
                {hr?.is_abnormal ? '偏高' : '正常范围'}
              </Badge>
            </div>
            <div className={styles.valueRow}>
              <span className={styles.healthValue}>{heartVal}</span>
              <span className={styles.healthUnit}>次/分</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={`${styles.progressFill} ${styles.progressFillRed}`}
                style={{ width: `${Math.min((parseInt(heartVal) / 120) * 100, 100)}%` }}
              />
            </div>
          </Card>

          {/* 血压 */}
          <Card variant="glass" className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardTitle}>
                <div className={`${styles.healthCardIcon} ${styles.iconBp}`}>
                  <Stethoscope size={20} />
                </div>
                <span className={styles.healthCardLabel}>血压</span>
              </div>
              <Badge variant={bp?.is_abnormal ? 'warning' : 'normal'}>
                {bp?.is_abnormal ? '偏高' : '正常'}
              </Badge>
            </div>
            <div className={styles.valueRow}>
              <span className={styles.healthValue}>{bpVal}</span>
              <span className={styles.healthUnit}>mmHg</span>
            </div>
          </Card>

          {/* 体温 */}
          {temp && (
            <Card variant="glass" className={styles.healthCard}>
              <div className={styles.healthCardHeader}>
                <div className={styles.healthCardTitle}>
                  <div className={`${styles.healthCardIcon} ${styles.iconTemperature}`}>
                    <Thermometer size={20} />
                  </div>
                  <span className={styles.healthCardLabel}>体温</span>
                </div>
                <Badge variant="normal">正常</Badge>
              </div>
              <div className={styles.valueRow}>
                <span className={styles.healthValue}>
                  {formatHealthValue('temperature', temp.values)}
                </span>
                <span className={styles.healthUnit}>°C</span>
              </div>
            </Card>
          )}
        </div>
      </DataStateWrapper>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={<Plus size={20} />}
        onClick={() => router.push('/health/input')}
        className={styles.addBtn}
      >
        添加新记录
      </Button>
    </div>
  );
}
