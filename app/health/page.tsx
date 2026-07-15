'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Droplets,
  Heart,
  Plus,
  Scale,
  Stethoscope,
  Thermometer,
  User,
} from 'lucide-react';
import {
  formatHealthValue,
  formatMeasuredTime,
  useHealthStore,
} from '@/stores/healthStore';
import type { HealthRecordType } from '@/types/health';
import { useCareRecipient } from '@/hooks/useCareRecipient';
import { Button, Card, Badge, IconButton } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import { CareRecipientTabs } from '@/components/family/CareRecipientTabs';
import styles from './page.module.css';

const METRICS = [
  { type: 'heart_rate', label: '心率', unit: '次/分', icon: Heart, tone: 'heart' },
  { type: 'blood_pressure', label: '血压', unit: 'mmHg', icon: Stethoscope, tone: 'pressure' },
  { type: 'blood_sugar', label: '血糖', unit: 'mmol/L', icon: Droplets, tone: 'sugar' },
  { type: 'temperature', label: '体温', unit: '°C', icon: Thermometer, tone: 'temperature' },
  { type: 'weight', label: '体重', unit: 'kg', icon: Scale, tone: 'weight' },
] satisfies Array<{
  type: HealthRecordType;
  label: string;
  unit: string;
  icon: typeof Heart;
  tone: string;
}>;

export default function HealthPage() {
  const router = useRouter();
  const {
    recipient,
    targetUserId,
    isFamily,
    isLoading: recipientLoading,
    error: recipientError,
    retry: retryRecipients,
  } = useCareRecipient();
  const latestRecords = useHealthStore((state) => state.latestRecords);
  const latestTargetKey = useHealthStore((state) => state.latestTargetKey);
  const loading = useHealthStore((state) => state.loading);
  const error = useHealthStore((state) => state.error);
  const fetchLatest = useHealthStore((state) => state.fetchLatest);

  useEffect(() => {
    if (targetUserId) void fetchLatest(targetUserId);
  }, [fetchLatest, targetUserId]);

  const isCurrentTarget = Boolean(
    targetUserId && latestTargetKey === targetUserId,
  );
  const visibleRecords = isCurrentTarget ? latestRecords : {};
  const records = Object.values(visibleRecords).filter(Boolean);
  const latestMeasuredAt = records.reduce<string | null>((latest, record) => {
    if (!record?.measured_at) return latest;
    if (!latest || new Date(record.measured_at) > new Date(latest)) {
      return record.measured_at;
    }
    return latest;
  }, null);
  const abnormalCount = records.filter((record) => record?.is_abnormal).length;
  const canEdit = Boolean(recipient?.permissions.canEditHealth);

  return (
    <div className={styles.page}>
      <PageHeader
        title={isFamily && recipient ? `${recipient.name}的健康` : '健康看板'}
        subtitle={isFamily ? '监护数据 · 非家属本人健康' : undefined}
        rightAction={
          <IconButton
            variant="soft"
            aria-label="前往设置"
            onClick={() => router.push('/settings')}
          >
            <User size={22} />
          </IconButton>
        }
      />

      <div className={styles.recipientRow}>
        <CareRecipientTabs className={styles.recipientTabs} />
      </div>

      <main className={styles.content}>
        <Card variant="glass" className={styles.statusCard}>
          <span className={styles.statusWatermark} aria-hidden="true">
            <Activity size={76} />
          </span>
          <div>
            <div className={styles.statusLabel}>当前概览</div>
            <div className={styles.statusValue}>
              {records.length === 0
                ? '等待首次记录'
                : abnormalCount > 0
                  ? `${abnormalCount} 项需要关注`
                  : '最近指标平稳'}
            </div>
          </div>
          <div className={styles.statusTimeGroup}>
            <div className={styles.statusLabel}>最近更新</div>
            <div className={styles.statusTimeValue}>
              {latestMeasuredAt ? formatMeasuredTime(latestMeasuredAt) : '--'}
            </div>
          </div>
        </Card>

        <DataStateWrapper
          loading={recipientLoading || Boolean(targetUserId && (!isCurrentTarget || loading))}
          error={recipientError ?? (isCurrentTarget ? error : null)}
          onRetry={recipientError
            ? retryRecipients
            : () => targetUserId && void fetchLatest(targetUserId)}
          empty={!targetUserId ? {
            icon: <Heart size={44} />,
            title: '请先绑定照护长辈',
            description: '家属端只展示已绑定长辈的健康信息',
          } : false}
        >
          <section className={styles.cards} aria-label="健康指标">
            {METRICS.map((metric) => {
              const record = visibleRecords[metric.type];
              const Icon = metric.icon;
              return (
                <Card
                  key={metric.type}
                  variant="glass"
                  className={`${styles.healthCard} ${styles[metric.tone]}`}
                >
                  <span className={styles.healthWatermark} aria-hidden="true">
                    <Icon size={72} />
                  </span>
                  <div className={styles.healthCardHeader}>
                    <div className={styles.healthCardTitle}>
                      <div className={styles.healthCardIcon}>
                        <Icon size={19} />
                      </div>
                      <span className={styles.healthCardLabel}>{metric.label}</span>
                    </div>
                    <Badge variant={record?.is_abnormal ? 'warning' : 'normal'}>
                      {!record ? '未记录' : record.is_abnormal ? '需关注' : '平稳'}
                    </Badge>
                  </div>
                  <div className={styles.valueRow}>
                    <span className={styles.healthValue}>
                      {record ? formatHealthValue(metric.type, record.values) : '--'}
                    </span>
                    <span className={styles.healthUnit}>{metric.unit}</span>
                  </div>
                  <div className={styles.healthMeta}>
                    {record ? formatMeasuredTime(record.measured_at) : '等待录入数据'}
                  </div>
                </Card>
              );
            })}
          </section>
        </DataStateWrapper>
      </main>

      <div className={styles.bottomAction}>
        <Button
          variant="primary"
          size="md"
          fullWidth
          leftIcon={<Plus size={19} />}
          disabled={!targetUserId || !canEdit}
          onClick={() => router.push('/health/input')}
          className={styles.addBtn}
        >
          {isFamily
            ? canEdit ? `为${recipient?.name ?? '长辈'}记录健康` : '长辈尚未授权代录'
            : '添加健康记录'}
        </Button>
      </div>
    </div>
  );
}
