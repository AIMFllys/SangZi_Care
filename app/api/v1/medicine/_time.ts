const CARE_TIME_ZONE = 'Asia/Shanghai';
const WEEKDAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function dateTimeParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CARE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getCareDateInfo(now = new Date()): {
  date: string;
  weekday: number;
  time: string;
} {
  const parts = dateTimeParts(now);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAY[parts.weekday] ?? 1,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function normalizePlanTime(value: string): string {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) throw new Error('用药计划时间格式无效');
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error('用药计划时间格式无效');
  return `${match[1]}:${match[2]}`;
}

/** 将中国标准时间的日期和计划 time 组合成数据库 timestamptz。 */
export function createScheduledAt(date: string, planTime: string): string {
  const time = normalizePlanTime(planTime);
  const result = new Date(`${date}T${time}:00+08:00`);
  if (Number.isNaN(result.getTime())) throw new Error('用药发生时间无效');
  return result.toISOString();
}

export function addCareDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(value.getTime()) || !Number.isInteger(days)) {
    throw new Error('照护日期无效');
  }
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function getCareWeekday(date: string): number {
  return getCareDateInfo(new Date(`${date}T12:00:00+08:00`)).weekday;
}

export function getCareDayRange(date: string): {
  start: string;
  endExclusive: string;
} {
  return {
    start: new Date(`${date}T00:00:00+08:00`).toISOString(),
    endExclusive: new Date(`${addCareDays(date, 1)}T00:00:00+08:00`).toISOString(),
  };
}
