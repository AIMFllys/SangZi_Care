'use client';

import { Button } from '@/components/ui';
import styles from './ResultView.module.css';

interface ResultViewProps {
  score: number;
  onReset: () => void;
}

function resultCopy(score: number) {
  if (score <= 3) {
    return {
      level: '健康底子硬，长寿有保障',
      advice: '您的生活习惯非常好！请继续保持，每年做基础体检。您的好身体就是给儿女最大的福气。',
      tone: 'good' as const,
    };
  }
  if (score <= 6.5) {
    return {
      level: '器官“维保期”，智能小帮手来助力',
      advice:
        '建议您今年让孩子们陪着，去医院给特定部位做个小检查（比如拍个CT、做个胃镜，或者抽血查个PSA），查完咱心里就彻底踏实了。',
      tone: 'watch' as const,
    };
  }
  return {
    level: '重点保护对象，早查早安心',
    advice:
      '为了爱您的孩子们，也为了您自己少受罪，强烈建议您这个月内叫上儿女陪您去大医院好好查一查。别怕花钱也别怕麻烦，现在的医学技术可发达了！',
    tone: 'alert' as const,
  };
}

export function ResultView({ score, onReset }: ResultViewProps) {
  const copy = resultCopy(score);

  return (
    <section className={`${styles.result} ${styles[copy.tone]}`} id="result-area" aria-live="polite">
      <p className={styles.kicker}>健康回执</p>
      <h2 className={styles.level}>{copy.level}</h2>
      <p className={styles.score}>
        风险评估分 <strong>{score.toFixed(1)}</strong> 分
      </p>
      <p className={styles.advice}>{copy.advice}</p>
      <p className={styles.note}>为了爱您的家人，请重视健康，定期筛查。</p>
      <Button variant="secondary" size="lg" fullWidth onClick={onReset}>
        重新填写
      </Button>
    </section>
  );
}
