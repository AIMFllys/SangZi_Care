'use client';

import { useRouter } from 'next/navigation';
import {
  Activity,
  Gauge,
  HeartHandshake,
  Mic2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import styles from './page.module.css';

const UPDATES = [
  {
    icon: ShieldCheck,
    title: '监护看板更清晰',
    description: '家属可切换照护长辈，查看今日用药、七日依从率、心率趋势和异常提醒。',
    tone: 'blue',
  },
  {
    icon: HeartHandshake,
    title: '健康与用药协作',
    description: '长辈授权后，家属可代录健康、设置用药计划、提醒时间并代确认服药。',
    tone: 'green',
  },
  {
    icon: Mic2,
    title: 'AI 陪伴与碎碎念',
    description: '语音陪伴支持文字朗读、健康信息整理，以及经长辈同意后同步碎碎念给家人。',
    tone: 'violet',
  },
  {
    icon: Gauge,
    title: '界面与加载优化',
    description: '统一按钮、开关和导航反馈，减少重复请求，让常用页面打开更快、更稳定。',
    tone: 'orange',
  },
] as const;

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <PageHeader
        title="消息通知"
        subtitle="版本动态"
        variant="detail"
        onBack={() => router.back()}
        transparent
      />

      <main className={styles.content}>
        <section className={styles.releaseCard} aria-labelledby="release-title">
          <span className={styles.releaseWatermark} aria-hidden="true">
            <Sparkles size={108} />
          </span>
          <div className={styles.releaseIcon} aria-hidden="true">
            <Activity size={28} />
          </div>
          <div className={styles.releaseCopy}>
            <span className={styles.eyebrow}>PRODUCT UPDATE</span>
            <h2 id="release-title">智护银龄 v1.1.0</h2>
            <p>让长辈更安心，让家属更清楚。</p>
          </div>
          <span className={styles.versionBadge}>本次更新</span>
        </section>

        <section className={styles.updateSection} aria-labelledby="update-title">
          <div className={styles.sectionHeading}>
            <span>WHAT&apos;S NEW</span>
            <h2 id="update-title">本次更新内容</h2>
          </div>
          <div className={styles.updateList}>
            {UPDATES.map(({ icon: Icon, title, description, tone }) => (
              <article className={styles.updateItem} key={title}>
                <span className={`${styles.itemIcon} ${styles[tone]}`} aria-hidden="true">
                  <Icon size={21} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className={styles.footerNote}>感谢你与我们一起守护每一份牵挂。</p>
      </main>
    </div>
  );
}
