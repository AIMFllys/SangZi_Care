'use client';

// ============================================================
// 桑梓智护 — 首页（老年人端 + 家属端条件渲染）
// 老年人端: Greeting + VoiceBall + FamilyCarousel + FunctionCards + EmergencyFAB
// 家属端:   Greeting + FamilyDashboard + FamilyCarousel + FunctionCards
// 需求: 3.1–3.9
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Greeting } from '@/components/home/Greeting';
import VoiceBall from '@/components/voice/VoiceBall';
import type { VoiceBallState } from '@/components/voice/VoiceBall';
import VoicePanel from '@/components/voice/VoicePanel';
import { FamilyCarousel } from '@/components/home/FamilyCarousel';
import { FunctionCards } from '@/components/home/FunctionCards';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';
import type { ElderHealthSummary, FamilyBindWithUser } from '@/stores/familyStore';
import styles from './page.module.css';

// ---- 家属端：老人健康摘要卡片 ----

function ElderHealthCard({
  bind,
  summary,
}: {
  bind: FamilyBindWithUser;
  summary: ElderHealthSummary | undefined;
}) {
  const { user } = bind;
  const name = user.name || '未设置姓名';
  const relation = bind.bind.relation || '家人';

  const medStatus = summary?.medicationStatus;
  const bp = summary?.latestBloodPressure;

  return (
    <div className={styles.healthCard}>
      <div className={styles.healthCardHeader}>
        <div className={styles.healthCardAvatar}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={name} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarFallback}>
              {name.charAt(0)}
            </span>
          )}
        </div>
        <div className={styles.healthCardInfo}>
          <span className={styles.healthCardName}>{name}</span>
          <span className={styles.healthCardRelation}>{relation}</span>
        </div>
      </div>

      <div className={styles.healthCardBody}>
        {/* 用药状态 */}
        <div className={styles.healthMetric}>
          <span className={styles.metricIcon}>💊</span>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>今日用药</span>
            {medStatus ? (
              <span className={styles.metricValue}>
                {medStatus.completed}/{medStatus.total} 已完成
              </span>
            ) : (
              <span className={styles.metricEmpty}>暂无用药计划</span>
            )}
          </div>
          {medStatus && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${medStatus.total > 0 ? (medStatus.completed / medStatus.total) * 100 : 0}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* 最近血压 */}
        <div className={styles.healthMetric}>
          <span className={styles.metricIcon}>❤️</span>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>最近血压</span>
            {bp ? (
              <span className={styles.metricValue}>
                {bp.systolic}/{bp.diastolic} mmHg
              </span>
            ) : (
              <span className={styles.metricEmpty}>暂无记录</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 家属端首页视图 ----

function FamilyHomeView() {
  const binds = useFamilyStore((s) => s.binds);
  const healthSummaries = useFamilyStore((s) => s.healthSummaries);
  const fetchElderHealthSummary = useFamilyStore((s) => s.fetchElderHealthSummary);

  // 拉取所有绑定老人的健康摘要
  useEffect(() => {
    binds.forEach((b) => {
      const elderId = b.bind.elder_id;
      if (elderId && !healthSummaries[elderId]) {
        fetchElderHealthSummary(elderId);
      }
    });
  }, [binds, healthSummaries, fetchElderHealthSummary]);

  return (
    <div className={styles.container}>
      {/* 1. 问候语 */}
      <div className={styles.greetingSection}>
        <Greeting />
      </div>

      {/* 2. 健康看板摘要 */}
      <div className={styles.dashboardSection}>
        <h2 className={styles.dashboardTitle}>健康看板</h2>
        {binds.length === 0 ? (
          <div className={styles.emptyDashboard}>
            <p className={styles.emptyText}>尚未绑定老人</p>
            <p className={styles.emptyHint}>前往设置 → 绑定管理添加家人</p>
          </div>
        ) : (
          <div className={styles.healthCardList}>
            {binds.map((b) => (
              <ElderHealthCard
                key={b.bind.id}
                bind={b}
                summary={healthSummaries[b.bind.elder_id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. 家属卡片轮播 */}
      <div className={styles.carouselSection}>
        <FamilyCarousel />
      </div>

      {/* 4. 功能卡片 */}
      <div className={styles.functionSection}>
        <FunctionCards />
      </div>
    </div>
  );
}

// ---- 老年人端首页视图 ----

function ElderHomeView() {
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceBallState>('idle');
  const [functionExpanded, setFunctionExpanded] = useState(false);
  const functionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSwipeDown = useCallback(() => {
    setVoicePanelOpen(true);
  }, []);

  const handleSwipeUp = useCallback(() => {
    setFunctionExpanded(true);
    functionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useSwipeGesture(containerRef, {
    onSwipeDown: handleSwipeDown,
    onSwipeUp: handleSwipeUp,
  });

  const handleVoiceActivate = useCallback(() => {
    if (voiceState === 'idle') {
      setVoiceState('listening');
    } else if (voiceState === 'listening') {
      setVoiceState('processing');
      setTimeout(() => setVoiceState('idle'), 2000);
    }
  }, [voiceState]);

  const handleVoicePanelClose = useCallback(() => {
    setVoicePanelOpen(false);
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.greetingSection}>
        <Greeting />
      </div>

      <div className={styles.voiceBallSection}>
        <VoiceBall state={voiceState} onActivate={handleVoiceActivate} />
      </div>

      <div className={styles.carouselSection}>
        <FamilyCarousel />
      </div>

      <p className={styles.swipeHint}>↑ 上滑查看更多功能</p>

      <div
        ref={functionRef}
        className={`${styles.functionSection} ${
          functionExpanded
            ? styles.functionSectionExpanded
            : styles.functionSectionCollapsed
        }`}
      >
        <FunctionCards />
      </div>

      <VoicePanel
        isOpen={voicePanelOpen}
        onClose={handleVoicePanelClose}
        state={voiceState}
      />
    </div>
  );
}

// ---- 主页入口：根据角色条件渲染 ----

export default function HomePage() {
  const initialize = useUserStore((s) => s.initialize);
  const fetchBinds = useFamilyStore((s) => s.fetchBinds);
  const isElder = useUserStore((s) => s.isElder);

  useEffect(() => {
    initialize();
    fetchBinds();
  }, [initialize, fetchBinds]);

  return isElder ? <ElderHomeView /> : <FamilyHomeView />;
}
