import { describe, expect, it } from 'vitest';
import type { Section } from '@/lib/types/questionnaire';
import { calculateScore, isSectionComplete } from '@/lib/utils/calculateScore';
import { QUESTIONNAIRE_SECTIONS } from '@/lib/data/questionnaire';

const sample: Section[] = [
  {
    id: 'demo',
    title: 'demo',
    questions: [
      { id: 'a', type: 'radio', label: 'A', options: ['低', '中', '高'], weight: 1 },
      { id: 'b', type: 'checkbox', label: 'B', options: ['低', '中', '高'], weight: 1 },
      { id: 'c', type: 'radio', label: 'C', options: ['是', '否'] },
    ],
  },
];

describe('calculateScore', () => {
  it('没有作答或没有权重时为 0', () => {
    expect(calculateScore(sample, {})).toBe(0);
    expect(calculateScore(sample, { c: '否' })).toBe(0);
  });

  it('单选按选项位置映射到 0-10，多选取平均后再加权', () => {
    expect(calculateScore(sample, { a: '低' })).toBe(0);
    expect(calculateScore(sample, { a: '高' })).toBe(10);
    expect(calculateScore(sample, { a: '中', b: ['低', '高'] })).toBe(5);
  });

  it('同步问卷包含全部 8 个模块', () => {
    expect(QUESTIONNAIRE_SECTIONS.map((section) => section.id)).toEqual([
      'base',
      'lung',
      'gut',
      'liver',
      'female',
      'male',
      'cervical',
      'pancreas',
    ]);
    expect(QUESTIONNAIRE_SECTIONS.flatMap((section) => section.questions)).toHaveLength(61);
  });

  it('多选题至少选一项才算完成', () => {
    expect(isSectionComplete(sample[0], { a: '低', b: [], c: '是' })).toBe(false);
    expect(isSectionComplete(sample[0], { a: '低', b: ['中'], c: '是' })).toBe(true);
  });
});
