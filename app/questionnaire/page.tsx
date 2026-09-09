'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Questionnaire } from '@/components/questionnaire/Questionnaire';
import { QUESTIONNAIRE_SECTIONS } from '@/lib/data/questionnaire';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

export default function QuestionnairePage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <PageHeader
        title="健康早筛"
        subtitle="关爱同行"
        variant="detail"
        onBack={() => router.push(ROUTES.HOME)}
        transparent
      />
      <main className={styles.content}>
        <Questionnaire sections={QUESTIONNAIRE_SECTIONS} />
        <p className={styles.footer}>您的每一份回答都为“家庭-社区-医疗”联动贡献力量</p>
      </main>
    </div>
  );
}
