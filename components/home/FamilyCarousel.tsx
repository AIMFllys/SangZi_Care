'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore, type FamilyBindWithUser } from '@/stores/familyStore';
import { jsBridge } from '@/lib/jsbridge';
import { ROUTES } from '@/lib/constants';
import styles from './FamilyCarousel.module.css';

// ---- 内部常量 ----
const SWIPE_THRESHOLD = 50;

// ---- 子组件：老年人端家属卡片 ----

interface ElderFamilyCardProps {
  bind: FamilyBindWithUser;
  onCall: (phone: string) => void;
}

function ElderFamilyCard({ bind, onCall }: ElderFamilyCardProps) {
  const { user, bind: bindData } = bind;
  const initial = user.name?.charAt(0) ?? '?';

  // 格式化最近联系时间
  const lastContact = user.last_active_at
    ? formatRelativeTime(user.last_active_at)
    : '暂无联系';

  return (
    <div className={styles.card} role="group" aria-label={`家属 ${user.name}`}>
      <div className={styles.cardHeader}>
        <div className={styles.avatar} aria-hidden="true">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" />
          ) : (
            initial
          )}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.name}</div>
          <div className={styles.relation}>{bindData.relation}</div>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>最近联系：</span>
        <span className={styles.summaryValue}>{lastContact}</span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.callBtn}
          onClick={() => onCall(user.phone)}
          aria-label={`打电话给${user.name}`}
        >
          📞 打电话
        </button>
      </div>
    </div>
  );
}

// ---- 子组件：家属端老人卡片 ----

interface FamilyElderCardProps {
  bind: FamilyBindWithUser;
  onCall: (phone: string) => void;
  onDetail: (userId: string) => void;
}

function FamilyElderCard({ bind, onCall, onDetail }: FamilyElderCardProps) {
  const { user, bind: bindData } = bind;
  const initial = user.name?.charAt(0) ?? '?';
  const { healthSummaries } = useFamilyStore();
  const summary = healthSummaries[user.id];

  const medText = summary?.medicationStatus
    ? `${summary.medicationStatus.completed}/${summary.medicationStatus.total}`
    : '--';

  const bpText = summary?.latestBloodPressure
    ? `${summary.latestBloodPressure.systolic}/${summary.latestBloodPressure.diastolic} mmHg`
    : '--';

  return (
    <div className={styles.card} role="group" aria-label={`老人 ${user.name}`}>
      <div className={styles.cardHeader}>
        <div className={styles.avatar} aria-hidden="true">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" />
          ) : (
            initial
          )}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.name}</div>
          <div className={styles.relation}>{bindData.relation}</div>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>今日用药：</span>
        <span className={styles.summaryValue}>{medText}</span>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>最近血压：</span>
        <span className={styles.summaryValue}>{bpText}</span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.callBtn}
          onClick={() => onCall(user.phone)}
          aria-label={`打电话给${user.name}`}
        >
          📞 打电话
        </button>
        <button
          className={styles.detailBtn}
          onClick={() => onDetail(user.id)}
          aria-label={`查看${user.name}的详细信息`}
        >
          📋 详细查看
        </button>
      </div>
    </div>
  );
}


// ---- 子组件：添加家属引导卡片 ----

interface GuideCardProps {
  isElder: boolean;
  onNavigate: () => void;
}

function GuideCard({ isElder, onNavigate }: GuideCardProps) {
  return (
    <div
      className={styles.guideCard}
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate();
        }
      }}
      aria-label={isElder ? '添加家属' : '绑定老人'}
    >
      <span className={styles.guideIcon} aria-hidden="true">➕</span>
      <span className={styles.guideText}>
        {isElder ? '添加家属' : '绑定老人'}
      </span>
      <span className={styles.guideHint}>
        {isElder
          ? '绑定家属后，他们可以关注您的健康'
          : '绑定老人后，您可以查看他们的健康状况'}
      </span>
    </div>
  );
}

// ---- 工具函数 ----

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return '刚刚';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;

  return new Date(isoString).toLocaleDateString('zh-CN');
}

// ---- 主组件 ----

export function FamilyCarousel() {
  const router = useRouter();
  const isElder = useUserStore((s) => s.isElder);
  const binds = useFamilyStore((s) => s.binds);

  const [currentIndex, setCurrentIndex] = useState(0);

  // 触摸滑动状态
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const isDragging = useRef(false);

  const activeBinds = binds.filter((b) => b.bind.status === 'active');
  const hasBinds = activeBinds.length > 0;
  const totalSlides = hasBinds ? activeBinds.length : 1;

  // ---- 滑动处理 ----

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalSlides - 1));
      setCurrentIndex(clamped);
    },
    [totalSlides],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (touchDeltaX.current < -SWIPE_THRESHOLD) {
      goTo(currentIndex + 1);
    } else if (touchDeltaX.current > SWIPE_THRESHOLD) {
      goTo(currentIndex - 1);
    }
    touchDeltaX.current = 0;
  }, [currentIndex, goTo]);

  // ---- 操作回调 ----

  const handleCall = useCallback((phone: string) => {
    jsBridge.makePhoneCall(phone);
  }, []);

  const handleDetail = useCallback(
    (userId: string) => {
      router.push(ROUTES.FAMILY_DETAIL(userId));
    },
    [router],
  );

  const handleNavigateToBind = useCallback(() => {
    router.push(ROUTES.SETTINGS_BIND);
  }, [router]);

  // ---- 渲染 ----

  return (
    <section
      className={styles.carousel}
      aria-label="家属卡片轮播"
      aria-roledescription="carousel"
    >
      <div
        className={styles.track}
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-live="polite"
      >
        {hasBinds ? (
          activeBinds.map((bind, idx) => (
            <div
              key={bind.bind.id}
              className={styles.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`第 ${idx + 1} 张，共 ${totalSlides} 张`}
            >
              {isElder ? (
                <ElderFamilyCard bind={bind} onCall={handleCall} />
              ) : (
                <FamilyElderCard
                  bind={bind}
                  onCall={handleCall}
                  onDetail={handleDetail}
                />
              )}
            </div>
          ))
        ) : (
          <div
            className={styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label="添加家属引导"
          >
            <GuideCard isElder={isElder} onNavigate={handleNavigateToBind} />
          </div>
        )}
      </div>

      {/* 分页指示器 */}
      {totalSlides > 1 && (
        <div className={styles.dots} role="tablist" aria-label="轮播分页">
          {Array.from({ length: totalSlides }, (_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ''}`}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`第 ${i + 1} 页`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
