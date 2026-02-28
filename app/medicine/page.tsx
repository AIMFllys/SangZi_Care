'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { useMedicineStore } from '@/stores/medicineStore';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';
import { MedicineTimeline } from '@/components/medicine/MedicineTimeline';
import { PlanForm } from '@/components/medicine/PlanForm';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

export default function MedicinePage() {
  const {
    todayTimeline,
    todayProgress,
    isLoading,
    error,
    fetchTodayTimeline,
    confirmMedication,
  } = useMedicineStore();

  const user = useUserStore((s) => s.user);
  const isElder = useUserStore((s) => s.isElder);
  const binds = useFamilyStore((s) => s.binds);
  const fetchBinds = useFamilyStore((s) => s.fetchBinds);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<
    import('@/stores/medicineStore').MedicationPlanResponse | undefined
  >(undefined);

  useEffect(() => {
    fetchTodayTimeline();
  }, [fetchTodayTimeline]);

  // 家属端需要拉取绑定关系以检查权限
  useEffect(() => {
    if (!isElder && binds.length === 0) {
      fetchBinds();
    }
  }, [isElder, binds.length, fetchBinds]);

  const handleRetry = useCallback(() => {
    fetchTodayTimeline();
  }, [fetchTodayTimeline]);

  // 检查家属是否有编辑用药计划权限
  const canEditMedicationBind = !isElder
    ? binds.find(
        (b) =>
          b.bind.status === 'active' && b.bind.can_edit_medication === true,
      )
    : undefined;

  const canEditMedication = !!canEditMedicationBind;
  const boundElderId = canEditMedicationBind?.bind.elder_id;

  const handleAddPlan = useCallback(() => {
    setEditingPlan(undefined);
    setShowPlanForm(true);
  }, []);

  const handlePlanFormSuccess = useCallback(() => {
    setShowPlanForm(false);
    setEditingPlan(undefined);
    fetchTodayTimeline();
  }, [fetchTodayTimeline]);

  const handlePlanFormCancel = useCallback(() => {
    setShowPlanForm(false);
    setEditingPlan(undefined);
  }, []);

  const totalCount = todayTimeline.length;
  const completedCount = todayTimeline.filter(
    (i) => i.status === 'taken',
  ).length;

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <h1 className={styles.title}>💊 用药管家</h1>
        <div className={styles.headerActions}>
          {canEditMedication && (
            <button
              className={styles.addPlanBtn}
              onClick={handleAddPlan}
              aria-label="添加用药计划"
            >
              ＋ 添加计划
            </button>
          )}
          <Link
            href={ROUTES.MEDICINE_HISTORY}
            className={styles.historyLink}
          >
            用药历史 →
          </Link>
        </div>
      </header>

      {/* 今日进度 */}
      <div className={styles.progressSection}>
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>今日用药进度</span>
            <span className={styles.progressValue}>{todayProgress}%</span>
          </div>
          <div
            className={styles.progressBarTrack}
            role="progressbar"
            aria-valuenow={todayProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`今日用药进度 ${todayProgress}%`}
          >
            <div
              className={styles.progressBarFill}
              style={{ width: `${todayProgress}%` }}
            />
          </div>
          <div className={styles.progressStats}>
            <span>已完成 {completedCount} 项</span>
            <span>共 {totalCount} 项</span>
          </div>
        </div>
      </div>

      {/* 时间线 */}
      <div className={styles.timelineSection}>
        {isLoading ? (
          <div className={styles.loading}>
            <span className={styles.loadingText}>加载中...</span>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <span className={styles.errorText}>{error}</span>
            <button className={styles.retryBtn} onClick={handleRetry}>
              重试
            </button>
          </div>
        ) : (
          <MedicineTimeline
            items={todayTimeline}
            onConfirm={confirmMedication}
          />
        )}
      </div>

      {/* 家属端用药计划表单 */}
      {showPlanForm && boundElderId && (
        <PlanForm
          elderId={boundElderId}
          plan={editingPlan}
          onSuccess={handlePlanFormSuccess}
          onCancel={handlePlanFormCancel}
        />
      )}
    </div>
  );
}
