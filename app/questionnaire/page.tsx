'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Questionnaire } from '@/components/questionnaire/Questionnaire';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { QUESTIONNAIRE_SECTIONS, sectionsForSex } from '@/lib/data/questionnaire';
import { ROUTES } from '@/lib/constants';
import { useUserStore } from '@/stores/userStore';
import {
  ageFromBirthDate,
  hasQuestionnaireProfile,
  questionnaireSex,
} from '@/lib/utils/age';
import styles from './page.module.css';

export default function QuestionnairePage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuthContext();
  const user = useUserStore((state) => state.user);
  const profileReady = hasQuestionnaireProfile(user);
  const sex = questionnaireSex(user?.gender);
  const age = ageFromBirthDate(user?.birth_date);
  const sections = useMemo(
    () => (sex ? sectionsForSex(QUESTIONNAIRE_SECTIONS, sex) : []),
    [sex],
  );
  const showFillPrompt = isReady && isAuthenticated && !profileReady;

  const goFillProfile = () => {
    router.replace(`${ROUTES.SETTINGS_PROFILE}?from=questionnaire`);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="健康早筛"
        subtitle="关爱同行"
        variant="detail"
        onBack={() => router.push(ROUTES.HOME)}
        transparent
      />
      {profileReady && sex ? (
        <Questionnaire
          sections={sections}
          profileLabel={`当前资料：${sex === 'female' ? '女' : '男'} · ${age}岁`}
          footer={<p className={styles.footer}>每一份回答，都在为家庭与社区贡献力量</p>}
        />
      ) : null}
      <ConfirmDialog
        open={showFillPrompt}
        title="先完善个人信息"
        description="健康早筛会按您的年龄和性别匹配问卷。请先填写出生日期，并选择男或女。"
        confirmLabel="去填写"
        cancelLabel="返回"
        onConfirm={goFillProfile}
        onCancel={() => router.push(ROUTES.HOME)}
      />
    </div>
  );
}
