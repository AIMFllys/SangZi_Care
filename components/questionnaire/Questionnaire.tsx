'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import type { Answer, AnswerMap, Section } from '@/lib/types/questionnaire';
import { calculateScore, isSectionComplete } from '@/lib/utils/calculateScore';
import { QuestionCard } from './QuestionCard';
import { ResultView } from './ResultView';
import styles from './Questionnaire.module.css';

interface QuestionnaireProps {
  sections: Section[];
}

type Stage = 'intro' | 'section' | 'result';

export function Questionnaire({ sections }: QuestionnaireProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [score, setScore] = useState<number | null>(null);
  const [hint, setHint] = useState('');

  const section = sections[sectionIndex];
  const total = sections.length;
  const isLast = sectionIndex === total - 1;
  const progressLabel = useMemo(
    () => `第 ${sectionIndex + 1} 部分，共 ${total} 部分`,
    [sectionIndex, total],
  );

  const handleAnswer = (questionId: string, value: Answer) => {
    setHint('');
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const goNext = () => {
    if (!section || !isSectionComplete(section, answers)) {
      setHint('请先完成本部分全部题目，再继续。');
      return;
    }
    if (isLast) {
      const nextScore = calculateScore(sections, answers);
      setScore(nextScore);
      setStage('result');
      return;
    }
    setSectionIndex((index) => index + 1);
  };

  const skipSection = () => {
    setHint('');
    if (isLast) {
      const nextScore = calculateScore(sections, answers);
      setScore(nextScore);
      setStage('result');
      return;
    }
    setSectionIndex((index) => index + 1);
  };

  const handleReset = () => {
    setAnswers({});
    setScore(null);
    setHint('');
    setSectionIndex(0);
    setStage('intro');
  };

  if (stage === 'result' && score !== null) {
    return <ResultView score={score} onReset={handleReset} />;
  }

  if (stage === 'intro') {
    return (
      <section className={styles.intro} aria-labelledby="questionnaire-title">
        <p className={styles.eyebrow}>关爱同行</p>
        <h2 id="questionnaire-title" className={styles.title}>
          家庭陪伴与老年早筛
        </h2>
        <p className={styles.lead}>
          <strong>同济医学院 · 慧老智治 医心为民</strong>
          您好！本问卷旨在了解长辈健康与家庭陪伴。答案无对错，请您放宽心填写。所有数据仅用于学术调研，感谢您的参与！
        </p>
        <p className={styles.meta}>共 {total} 个部分，可按自己的节奏一页一页填写。</p>
        <Button variant="primary" size="lg" fullWidth onClick={() => setStage('section')}>
          开始填写
        </Button>
      </section>
    );
  }

  if (!section) return null;

  return (
    <section className={styles.panel} aria-labelledby="section-title">
      <div className={styles.progress} aria-label={progressLabel}>
        <span>{progressLabel}</span>
        <span>
          {section.questions.length} 题
          {section.gender === 'female' ? ' · 女性' : section.gender === 'male' ? ' · 男性' : ''}
        </span>
      </div>
      <div className={styles.track} aria-hidden="true">
        <div
          className={styles.trackFill}
          style={{ width: `${((sectionIndex + 1) / total) * 100}%` }}
        />
      </div>
      <h2 id="section-title" className={styles.sectionTitle}>
        {section.title}
      </h2>
      {section.gender ? (
        <p className={styles.skipHint}>
          这一部分按性别设计。如果和您或家中长辈情况不符，可以跳过。
        </p>
      ) : null}

      <div className={styles.questions}>
        {section.questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            answer={answers[question.id]}
            onAnswer={handleAnswer}
          />
        ))}
      </div>

      {hint ? (
        <p className={styles.hint} role="alert">
          {hint}
        </p>
      ) : null}

      <div className={styles.actions}>
        {sectionIndex > 0 ? (
          <Button variant="ghost" size="lg" onClick={() => setSectionIndex((index) => index - 1)}>
            上一部分
          </Button>
        ) : null}
        {section.gender ? (
          <Button variant="soft" size="lg" onClick={skipSection}>
            跳过本部分
          </Button>
        ) : null}
        <Button variant="primary" size="lg" fullWidth onClick={goNext}>
          {isLast ? '查看我的健康回执' : '下一部分'}
        </Button>
      </div>
    </section>
  );
}
