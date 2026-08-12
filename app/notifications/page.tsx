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
import { APP_VERSION } from '@/lib/constants';
import styles from './page.module.css';

const UPDATES = [
  {
    icon: Mic2,
    title: '消息与语音更顺手',
    description: '语音转文字后可以直接编辑；手动输入不会被覆盖，文字和语音发送也会保持清晰分流。',
    tone: 'blue',
  },
  {
    icon: Gauge,
    title: 'AI 回复更清楚',
    description: '长回复支持卡片内滚动，记录、提醒和同步结果会明确显示成功、提醒或失败状态。',
    tone: 'green',
  },
  {
    icon: ShieldCheck,
    title: '紧急求助更安全',
    description: '紧急求助防止重复点击，通知过程保持一致；没有可通知家属时也会明确提示。',
    tone: 'violet',
  },
  {
    icon: HeartHandshake,
    title: '健康草稿不丢失',
    description: '切换健康记录 Tab 会保留草稿，统一确认后一次保存，离开页面前会提醒你处理未保存内容。',
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
            <h2 id="release-title">智护银龄 v{APP_VERSION}</h2>
            <p>1.2.0 聚焦消息、AI 语音、紧急求助与健康记录体验升级。</p>
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
