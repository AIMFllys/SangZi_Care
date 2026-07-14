export const ELDER_RELATION_OPTIONS = [
  '父亲',
  '母亲',
  '爷爷',
  '奶奶',
  '外公',
  '外婆',
  '配偶',
  '其他长辈',
] as const;

export type ElderRelation = (typeof ELDER_RELATION_OPTIONS)[number];

export function isElderRelation(value: string): value is ElderRelation {
  return (ELDER_RELATION_OPTIONS as readonly string[]).includes(value);
}

/** 旧版把关系方向存反；在用户重新确认前不做不可靠的亲属推断。 */
export function displayElderRelation(value: string | null | undefined): string {
  return value && isElderRelation(value) ? value : '待确认关系';
}
