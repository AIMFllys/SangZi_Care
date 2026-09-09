export type QuestionType = 'radio' | 'checkbox';

export type Answer = string | string[];

export type AnswerMap = Record<string, Answer>;

export type Question = {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
  weight?: number;
};

export type Section = {
  id: string;
  title: string;
  gender?: 'male' | 'female';
  questions: Question[];
};
