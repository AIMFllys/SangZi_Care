'use client';

import { useEffect, useCallback } from 'react';
import { useMedicineStore } from '@/stores/medicineStore';
import type { MedicationPlanResponse } from '@/stores/medicineStore';
import { ROUTES } from '@/lib/constants';
import { Clock, Calendar, CheckCircle, Archive } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import styles from './page.module.css';

/** 格式化日期范围显示 */
function formatDateRange(startDate: string, endDate: string | null): string {
  const start = startDate.replace(/-/g, '/');
  if (!endDate) return `${start} 起`;
  return `${start} ~ ${endDate.replace(/-/g, '/')}`;
}

/** 单个用药计划卡片 */
function PlanCard({
  plan,
  isActive,
}: {
  plan: MedicationPlanResponse;
  isActive: boolean;
}) {
  return (
    <Card variant="glass" className={styles.planCard}>
      <div
        className={`${styles.indicator} ${isActive ? styles.indicatorActive : styles.indicatorInactive}`}
        aria-hidden="true"
      />
      <div className={styles.cardContent}>
        <span className={styles.medicineName}>{plan.medicine_name}</span>
        <span className={styles.dosage}>{plan.dosage}</span>
        {plan.schedule_times && plan.schedule_times.length > 0 && (
          <div className={styles.scheduleTimes}>
            {plan.schedule_times.map((time) => (
              <Badge key={time} variant="normal" className={styles.timeTag}>
                <Clock size={16} /> {time}
              </Badge>
            ))}
          </div>
        )}
        <span className={styles.dateRange}>
          <Calendar size={16} /> {formatDateRange(plan.start_date, plan.end_date)}
        </span>
      </div>
    </Card>
  );
}

export default function MedicineHistoryPage() {
  const { plans, isLoading, error, fetchAllPlans } = useMedicineStore();

  useEffect(() => {
    fetchAllPlans();
  }, [fetchAllPlans]);

  const handleRetry = useCallback(() => {
    fetchAllPlans();
  }, [fetchAllPlans]);

  // 按活跃状态分组
  const activePlans = plans.filter((p) => p.is_active);
  const inactivePlans = plans.filter((p) => !p.is_active);

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <PageHeader title="用药历史" backHref={ROUTES.MEDICINE} variant="detail" />

      {/* 内容区域 */}
      <div className={styles.scroller}>
      {isLoading ? (
        <div className={styles.loading}>
          <span className={styles.loadingText}>加载中...</span>
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <span className={styles.errorText}>{error}</span>
          <Button variant="primary" onClick={handleRetry}>
            重试
          </Button>
        </div>
      ) : (
        <>
          {/* 当前用药 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <CheckCircle size={20} color="var(--color-success)" /> 当前用药
            </h2>
            {activePlans.length === 0 ? (
              <p className={styles.emptySection}>暂无当前用药计划</p>
            ) : (
              activePlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} isActive />
              ))
            )}
          </section>

          {/* 历史用药 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Archive size={20} color="var(--text-muted)" /> 历史用药
            </h2>
            {inactivePlans.length === 0 ? (
              <p className={styles.emptySection}>暂无历史用药记录</p>
            ) : (
              inactivePlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} isActive={false} />
              ))
            )}
          </section>
        </>
      )}
      </div>
    </div>
  );
}
