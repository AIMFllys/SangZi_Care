'use client';

// ============================================================
// 桑梓智护 — 家属/老人详情页（客户端组件）
// 老年人端：查看家属基本信息、最近在线时间
// 家属端：查看老人完整健康数据、用药状态、AI对话记录
// ============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useHealthStore, formatHealthValue, RECORD_TYPE_CONFIG } from '@/stores/healthStore';
import { useMedicineStore } from '@/stores/medicineStore';
import { fetchApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

// ---------- 类型 ----------

interface AiConversation {
  id: string;
  user_input: string;
  ai_response: string;
  intent: string | null;
  created_at: string | null;
}

// ---------- 工具 ----------

function formatLastActive(dateStr: string | null | undefined): string {
  if (!dateStr) return '未知';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚在线';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}小时前`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}天前`;
  } catch {
    return '未知';
  }
}

// ---------- 组件 ----------

interface Props {
  userId: string;
}

export default function FamilyDetailClient({ userId }: Props) {
  const router = useRouter();
  const currentUser = useUserStore((s) => s.user);
  const isElder = useUserStore((s) => s.isElder);
  const binds = useFamilyStore((s) => s.binds);
  const healthSummaries = useFamilyStore((s) => s.healthSummaries);
  const fetchElderHealthSummary = useFamilyStore((s) => s.fetchElderHealthSummary);
  const { latestRecords, fetchLatest } = useHealthStore();
  const { todayTimeline, todayProgress, fetchTodayTimeline } = useMedicineStore();

  const [aiConversations, setAiConversations] = useState<AiConversation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // 找到对应的绑定关系
  const bind = binds.find(
    (b) => b.user.id === userId || b.bind.elder_id === userId || b.bind.family_id === userId,
  );

  const targetUser = bind?.user;
  const relation = bind?.bind.relation ?? '';

  // 家属端：加载老人健康数据
  useEffect(() => {
    if (!isElder && userId) {
      fetchElderHealthSummary(userId);
      // 加载老人的健康记录和用药状态
      fetchLatest();
      fetchTodayTimeline();
      // 加载AI对话记录
      loadAiConversations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isElder]);

  async function loadAiConversations() {
    setAiLoading(true);
    try {
      const data = await fetchApi<AiConversation[]>(
        `/api/v1/ai/conversations?user_id=${userId}&limit=5`,
      );
      setAiConversations(data);
    } catch {
      // 静默失败
    } finally {
      setAiLoading(false);
    }
  }

  // 拨打电话
  function handleCall() {
    if (targetUser) {
      // 通过 JSBridge 或 tel: 协议拨打
      window.location.href = `tel:${targetUser.phone ?? ''}`;
    }
  }

  // 发消息
  function handleMessage() {
    router.push(ROUTES.MESSAGES_CHAT(userId));
  }

  if (!bind || !targetUser) {
    return (
      <main className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.back()}
            aria-label="返回"
          >
            ‹ 返回
          </button>
          <h1 className={styles.title}>详情</h1>
        </div>
        <div className={styles.empty}>未找到该用户信息</div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      {/* 顶部导航 */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.back()}
          aria-label="返回"
        >
          ‹ 返回
        </button>
        <h1 className={styles.title}>{isElder ? '家属详情' : '老人详情'}</h1>
      </div>

      {/* 用户基本信息卡片 */}
      <section className={styles.profileCard} aria-label="基本信息">
        <div className={styles.avatar} aria-hidden="true">
          {targetUser.name.charAt(0)}
        </div>
        <div className={styles.profileInfo}>
          <p className={styles.userName}>{targetUser.name}</p>
          <p className={styles.userRelation}>{relation}</p>
          <p className={styles.lastActive}>
            最近在线：{formatLastActive(targetUser.last_active_at)}
          </p>
        </div>
      </section>

      {/* 操作按钮 */}
      <div className={styles.actionRow}>
        <button
          className={styles.actionButton}
          onClick={handleCall}
          aria-label={`拨打${targetUser.name}的电话`}
        >
          📞 打电话
        </button>
        <button
          className={styles.actionButton}
          onClick={handleMessage}
          aria-label={`给${targetUser.name}发消息`}
        >
          💬 发消息
        </button>
      </div>

      {/* 家属端：老人健康数据 */}
      {!isElder && (
        <>
          {/* 健康数据摘要 */}
          <section className={styles.section} aria-label="健康数据">
            <h2 className={styles.sectionTitle}>健康数据</h2>
            <div className={styles.healthGrid}>
              {Object.entries(RECORD_TYPE_CONFIG).map(([type, config]) => {
                const record = latestRecords[type];
                return (
                  <div key={type} className={styles.healthItem}>
                    <span className={styles.healthIcon} aria-hidden="true">{config.icon}</span>
                    <span className={styles.healthLabel}>{config.label}</span>
                    <span className={styles.healthValue}>
                      {record ? formatHealthValue(type, record.values) : '--'}
                    </span>
                    <span className={styles.healthUnit}>{config.unit}</span>
                    {record?.is_abnormal && (
                      <span className={styles.abnormalBadge} role="alert">异常</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 今日用药状态 */}
          <section className={styles.section} aria-label="今日用药">
            <h2 className={styles.sectionTitle}>今日用药</h2>
            <div className={styles.medicineProgress}>
              <div className={styles.progressBar} role="progressbar" aria-valuenow={todayProgress} aria-valuemin={0} aria-valuemax={100}>
                <div className={styles.progressFill} style={{ width: `${todayProgress}%` }} />
              </div>
              <span className={styles.progressText}>{todayProgress}% 已完成</span>
            </div>
            {todayTimeline.length === 0 ? (
              <p className={styles.emptyText}>今日暂无用药计划</p>
            ) : (
              <ul className={styles.medicineList}>
                {todayTimeline.slice(0, 5).map((item) => (
                  <li key={`${item.plan.id}-${item.scheduled_time}`} className={styles.medicineItem}>
                    <span className={styles.medicineName}>{item.plan.medicine_name}</span>
                    <span className={styles.medicineTime}>{item.scheduled_time}</span>
                    <span className={`${styles.medicineStatus} ${styles[`status_${item.status}`]}`}>
                      {item.status === 'taken' ? '✅ 已服' : item.status === 'pending' ? '⏳ 待服' : '⚠️ 未服'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* AI对话记录 */}
          <section className={styles.section} aria-label="AI对话记录">
            <h2 className={styles.sectionTitle}>近期AI对话</h2>
            {aiLoading ? (
              <p className={styles.loadingText}>加载中…</p>
            ) : aiConversations.length === 0 ? (
              <p className={styles.emptyText}>暂无对话记录</p>
            ) : (
              <ul className={styles.conversationList}>
                {aiConversations.map((conv) => (
                  <li key={conv.id} className={styles.conversationItem}>
                    <p className={styles.convUserInput}>老人：{conv.user_input}</p>
                    <p className={styles.convAiResponse}>助手：{conv.ai_response}</p>
                    {conv.created_at && (
                      <p className={styles.convTime}>
                        {new Date(conv.created_at).toLocaleString('zh-CN')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* 老年人端：家属简要信息 */}
      {isElder && (
        <section className={styles.section} aria-label="家属信息">
          <h2 className={styles.sectionTitle}>家属信息</h2>
          <div className={styles.elderFamilyInfo}>
            <p className={styles.infoRow}>
              <span className={styles.infoLabel}>姓名</span>
              <span className={styles.infoValue}>{targetUser.name}</span>
            </p>
            <p className={styles.infoRow}>
              <span className={styles.infoLabel}>关系</span>
              <span className={styles.infoValue}>{relation}</span>
            </p>
            <p className={styles.infoRow}>
              <span className={styles.infoLabel}>最近在线</span>
              <span className={styles.infoValue}>{formatLastActive(targetUser.last_active_at)}</span>
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
