export const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

const WEEKDAY_FROM_ZH: Record<string, string> = {
  日: '日',
  一: '一',
  二: '二',
  三: '三',
  四: '四',
  五: '五',
  六: '六',
};

export interface ShanghaiClock {
  time: string;
  date: string;
  hour: number;
}

export function formatShanghaiClock(now: Date = new Date()): ShanghaiClock {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const hourText = value('hour').padStart(2, '0');
  const minuteText = value('minute').padStart(2, '0');
  const weekdayRaw = value('weekday').replace('周', '').replace('星期', '');
  const weekday = WEEKDAY_FROM_ZH[weekdayRaw] ?? weekdayRaw;

  return {
    time: `${hourText}:${minuteText}`,
    date: `${Number(value('month'))}月${Number(value('day'))}日 星期${weekday}`,
    hour: Number(hourText),
  };
}
