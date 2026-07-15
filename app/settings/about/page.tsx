'use client';

import { useRouter } from 'next/navigation';
import { GraduationCap, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { APP_VERSION } from '@/lib/constants';
import styles from './page.module.css';

const PROJECT_NAME = '华中科技大学基础医学院“慧老智治医心为民”AI智慧医养暑期实践项目';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <PageHeader
        title="关于我们"
        subtitle="智护银龄"
        variant="detail"
        onBack={() => router.back()}
        transparent
      />

      <main className={styles.content}>
        <section className={styles.brandCard} aria-labelledby="brand-title">
          <span className={styles.watermark} aria-hidden="true">
            <Sparkles size={112} />
          </span>
          <span className={styles.brandIcon} aria-hidden="true">
            <HeartHandshake size={30} />
          </span>
          <div className={styles.brandCopy}>
            <span>SMART ELDER CARE</span>
            <h2 id="brand-title">智护银龄</h2>
            <p>科技有温度，守护有回应。</p>
          </div>
          <strong>v{APP_VERSION}</strong>
        </section>

        <section className={styles.projectCard} aria-labelledby="project-title">
          <span className={styles.projectIcon} aria-hidden="true">
            <GraduationCap size={23} />
          </span>
          <div>
            <span className={styles.eyebrow}>PROJECT TEAM</span>
            <h2 id="project-title">实践项目</h2>
            <p>{PROJECT_NAME}</p>
          </div>
        </section>

        <section className={styles.mission} aria-label="项目愿景">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>以 AI 与数字化协作连接长辈和家属，让健康记录、用药提醒与日常关怀真正贯通。</p>
        </section>

        <p className={styles.copyright}>© 2026 智护银龄项目组</p>
      </main>
    </div>
  );
}
