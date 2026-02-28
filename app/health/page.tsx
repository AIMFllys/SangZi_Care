'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHealthStore, RECORD_TYPES, RECORD_TYPE_CONFIG, formatHealthValue, formatMeasuredTime } from '@/stores/healthStore';
import { HealthCard } from '@/components/health/HealthCard';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

export default function HealthPage() {
  const router = useRouter();
  const {
    latestRecords,
    trendData,
    selectedType,
    loading,
    error,
    fetchLatest,
    fetchTrend,
    setSelectedType,
  } = useHealthStore();

  // 初始加载最新数据
  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  // 选中类型变化时加载趋势
  useEffect(() => {
    if (selectedType) {
      fetchTrend(selectedType);
    }
  }, [selectedType, fetchTrend]);

  const handleCardClick = useCallback(
    (type: string) => {
      setSelectedType(type);
    },
    [setSelectedType],
  );

  const handleRetry = useCallback(() => {
    fetchLatest();
    if (selectedType) {
      fetchTrend(selectedType);
    }
  }, [fetchLatest, fetchTrend, selectedType]);

  const trendConfig = RECORD_TYPE_CONFIG[selectedType];

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(ROUTES.HOME)}
          aria-label="返回首页"
          type="button"
        >
          ←
        </button>
        <h1 className={styles.title}>❤️ 健康记录</h1>
      </header>

      {/* 错误状态 */}
      {error && (
        <div className={styles.errorBox}>
          <span className={styles.errorText}>{error}</span>
          <button className={styles.retryBtn} onClick={handleRetry} type="button">
            重试
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && !error && (
        <div className={styles.loading}>
          <span className={styles.loadingText}>加载中...</span>
        </div>
      )}

      {/* 健康卡片网格 */}
      {!loading && !error && (
        <>
          <section className={styles.cardsSection} aria-label="健康数据概览">
            <div className={styles.cardsGrid}>
              {RECORD_TYPES.map((type, index) => {
                const isLast = index === RECORD_TYPES.length - 1;
                const isOddTotal = RECORD_TYPES.length % 2 === 1;
                return (
                  <div
                    key={type}
                    className={isLast && isOddTotal ? styles.cardCentered : undefined}
                  >
                    <HealthCard
                      type={type}
                      record={latestRecords[type] ?? null}
                      selected={selectedType === type}
                      onClick={() => handleCardClick(type)}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* 趋势数据 */}
          <section className={styles.trendSection} aria-label="趋势数据">
            <div className={styles.trendHeader}>
              <h2 className={styles.trendTitle}>
                {trendConfig?.icon} {trendConfig?.label ?? ''}近期趋势
              </h2>
            </div>
            <div className={styles.trendCard}>
              {trendData.length > 0 ? (
                <ul className={styles.trendList} role="list">
                  {trendData.map((record) => {
                    const isAbnormal = record.is_abnormal === true;
                    return (
                      <li key={record.id} className={styles.trendItem} role="listitem">
                        <span className={styles.trendDate}>
                          {formatMeasuredTime(record.measured_at)}
                        </span>
                        <span>
                          <span
                            className={`${styles.trendValue} ${isAbnormal ? styles.trendValueAbnormal : ''}`}
                          >
                            {formatHealthValue(selectedType, record.values)}
                          </span>
                          <span className={styles.trendUnit}>
                            {trendConfig?.unit}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.trendEmpty}>暂无趋势数据</div>
              )}
            </div>
          </section>
        </>
      )}

      {/* 底部操作 */}
      <div className={styles.actions}>
        <Link href={ROUTES.HEALTH_INPUT} className={styles.inputBtn}>
          📝 录入健康数据
        </Link>
      </div>
    </div>
  );
}
