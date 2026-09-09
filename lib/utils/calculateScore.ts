import type { AnswerMap, Section } from '@/lib/types/questionnaire';

/**
 * 计算问卷风险评分。
 * 只处理带 weight 的题目；选项越靠后风险越高。
 * 单选按选项位置映射到 0–10；多选取所选选项得分的平均值。
 * 加权求和后除以总权重，保留一位小数。
 */
export function calculateScore(sections: Section[], answers: AnswerMap): number {
  let totalScore = 0;
  let totalWeight = 0;

  sections.forEach((section) => {
    section.questions.forEach((question) => {
      if (!question.weight) return;

      const answer = answers[question.id];
      if (!answer) return;

      const options = question.options;
      let scoreValue = 0;

      if (Array.isArray(answer)) {
        const sum = answer.reduce((acc, val) => {
          const idx = options.indexOf(val);
          return acc + (idx >= 0 ? (idx / (options.length - 1)) * 10 : 0);
        }, 0);
        scoreValue = answer.length > 0 ? sum / answer.length : 0;
      } else {
        const idx = options.indexOf(answer);
        if (idx >= 0) {
          scoreValue = (idx / (options.length - 1)) * 10;
        }
      }

      totalScore += scoreValue * question.weight;
      totalWeight += question.weight;
    });
  });

  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;
}

export function isQuestionAnswered(answer: AnswerMap[string] | undefined): boolean {
  if (answer == null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  return answer.trim().length > 0;
}

export function isSectionComplete(section: Section, answers: AnswerMap): boolean {
  return section.questions.every((question) => isQuestionAnswered(answers[question.id]));
}
