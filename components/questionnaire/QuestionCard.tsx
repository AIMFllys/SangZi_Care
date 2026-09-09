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

  return (
    <fieldset className={styles.card}>
      <legend className={styles.legend}>{question.label}</legend>
      <div className={styles.options} role={isCheckbox ? 'group' : 'radiogroup'}>
        {question.options.map((option) => {
          const checked = isCheckbox ? selected.includes(option) : answer === option;
          return (
            <OptionItem
              key={option}
              type={question.type}
              name={question.id}
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
    </fieldset>
  );
}
