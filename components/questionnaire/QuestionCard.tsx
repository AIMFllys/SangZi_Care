'use client';

import type { Answer, Question } from '@/lib/types/questionnaire';
import { OptionItem } from './OptionItem';
import styles from './QuestionCard.module.css';

interface QuestionCardProps {
  question: Question;
  answer: Answer | undefined;
  onAnswer: (questionId: string, value: Answer) => void;
}

export function QuestionCard({ question, answer, onAnswer }: QuestionCardProps) {
  const isCheckbox = question.type === 'checkbox';
  const selected = isCheckbox ? ((answer as string[] | undefined) ?? []) : [];
  const headingId = `${question.id}-label`;

  return (
    <div
      className={styles.card}
      role={isCheckbox ? 'group' : 'radiogroup'}
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className={styles.legend}>{question.label}</h3>
      <div className={styles.options}>
        {question.options.map((option) => {
          const checked = isCheckbox ? selected.includes(option) : answer === option;
          return (
            <OptionItem
              key={option}
              type={question.type}
              label={option}
              checked={checked}
              onSelect={() => {
                if (isCheckbox) {
                  const next = selected.includes(option)
                    ? selected.filter((item) => item !== option)
                    : [...selected, option];
                  onAnswer(question.id, next);
                  return;
                }
                onAnswer(question.id, option);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
