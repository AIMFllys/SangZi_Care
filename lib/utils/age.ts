const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const [, yearText, monthText, dayText] = value.match(DATE_PATTERN) ?? [];
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return day >= 1 && day <= daysInMonth(year, month);
}

export function ageFromBirthDate(
  birthDate: string | null | undefined,
  today = new Date(),
): number | null {
  if (!isIsoDate(birthDate)) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  let age = today.getFullYear() - year;
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}

export function questionnaireSex(
  gender: string | null | undefined,
): 'male' | 'female' | null {
  if (gender === 'male' || gender === '男') return 'male';
  if (gender === 'female' || gender === '女') return 'female';
  return null;
}

export function hasQuestionnaireProfile(user: {
  birth_date?: string | null;
  gender?: string | null;
} | null | undefined): boolean {
  if (!user) return false;
  return ageFromBirthDate(user.birth_date) != null
    && questionnaireSex(user.gender) != null;
}
