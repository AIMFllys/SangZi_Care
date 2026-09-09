import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_SECTIONS, sectionsForSex } from '@/lib/data/questionnaire';
import {
  ageFromBirthDate,
  hasQuestionnaireProfile,
  questionnaireSex,
} from '../age';

describe('questionnaire profile helpers', () => {
  it('从出生日期计算实足年龄', () => {
    expect(ageFromBirthDate('1950-05-15', new Date('2026-05-15'))).toBe(76);
    expect(ageFromBirthDate('1950-05-15', new Date('2026-05-14'))).toBe(75);
    expect(ageFromBirthDate('2026-02-30')).toBeNull();
    expect(ageFromBirthDate(null)).toBeNull();
  });

  it('只把男/女当作问卷可用的明确性别', () => {
    expect(questionnaireSex('male')).toBe('male');
    expect(questionnaireSex('女')).toBe('female');
    expect(questionnaireSex('other')).toBeNull();
    expect(questionnaireSex(null)).toBeNull();
  });

  it('出生日期和明确性别都有才算资料齐全', () => {
    expect(hasQuestionnaireProfile({ birth_date: '1950-05-15', gender: 'female' })).toBe(true);
    expect(hasQuestionnaireProfile({ birth_date: '1950-05-15', gender: 'other' })).toBe(false);
    expect(hasQuestionnaireProfile({ birth_date: '', gender: 'male' })).toBe(false);
    expect(hasQuestionnaireProfile(null)).toBe(false);
  });

  it('按性别去掉不匹配的专属模块', () => {
    const female = sectionsForSex(QUESTIONNAIRE_SECTIONS, 'female').map((section) => section.id);
    const male = sectionsForSex(QUESTIONNAIRE_SECTIONS, 'male').map((section) => section.id);
    expect(female).toContain('female');
    expect(female).toContain('cervical');
    expect(female).not.toContain('male');
    expect(male).toContain('male');
    expect(male).not.toContain('female');
    expect(male).not.toContain('cervical');
  });
});
