'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ROUTES } from '@/lib/constants';
import { useUserStore } from '@/stores/userStore';
import { hasQuestionnaireProfile } from '@/lib/utils/age';
import styles from './QuestionnaireEntry.module.css';

interface QuestionnaireEntryProps {
  variant?: 'icon' | 'chip';
}

export function QuestionnaireEntry({ variant = 'icon' }: QuestionnaireEntryProps) {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuthContext();
  const user = useUserStore((state) => state.user);
  const [promptOpen, setPromptOpen] = useState(false);
  const iconSize = variant === 'chip' ? 22 : 26;

  const openQuestionnaire = () => {
    if (!isReady || !isAuthenticated) return;
    if (hasQuestionnaireProfile(user)) {
      router.push(ROUTES.QUESTIONNAIRE);
      return;
    }
    setPromptOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.entry} ${variant === 'chip' ? styles.chip : styles.icon}`}
        aria-label="打开健康早筛问卷"
        onClick={openQuestionnaire}
      >
        <ClipboardList size={iconSize} strokeWidth={2.25} aria-hidden="true" />
        {variant === 'chip' ? <span>问卷</span> : null}
      </button>
      <ConfirmDialog
        open={promptOpen}
        title="先完善个人信息"
        description="健康早筛会按您的年龄和性别匹配问卷。请先填写出生日期，并选择男或女。"
        confirmLabel="去填写"
        cancelLabel="取消"
        onConfirm={() => {
          setPromptOpen(false);
          router.push(`${ROUTES.SETTINGS_PROFILE}?from=questionnaire`);
        }}
        onCancel={() => setPromptOpen(false)}
      />
    </>
  );
}
