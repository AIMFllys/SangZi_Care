'use client';

import { useRouter } from 'next/navigation';
import {
  Activity,
  Gauge,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { APP_VERSION } from '@/lib/constants';
import styles from './page.module.css';

const UPDATES = [
  {
    icon: HeartHandshake,
    title: '健康早筛问卷',
    description: '首页和主要页面右上角可以进入早筛问卷，题目与同济医学院关爱同行问卷保持一致。',
    tone: 'orange',
  },
  {
    icon: Sparkles,
    title: '开屏更有温度',
    description: '打开应用会先看到智护银龄的标识和字标动画，再进入首页或登录。',
    tone: 'blue',
  },
  {
    icon: ShieldCheck,
    title: '登录前先说明',
    description: '没有登录时不再直接跳走，会先弹出说明，点“去登录”后再进入登录页。',
    tone: 'violet',
  },
  {
    icon: Gauge,
    title: '登录步骤更清楚',
    description: '邮箱、算术确认和验证码分成三步，大字号、大按钮，适合慢慢填写。',
    tone: 'green',
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
            <p>2.0.0 同时提供网页端 Web 壳与原生 Android 两套正式包，并修复首页时间、底栏与确认弹窗。</p>
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
