import { describe, expect, it } from 'vitest';
import {
  addCareDays,
  createScheduledAt,
  getCareDateInfo,
  getCareDayRange,
  getCareWeekday,
  normalizePlanTime,
} from '../_time';

describe('care medication time', () => {
  it('统一 time[] 的显示格式', () => {
    expect(normalizePlanTime('08:30:00')).toBe('08:30');
    expect(normalizePlanTime('20:05')).toBe('20:05');
  });

  it('将上海本地计划时间转换为完整 timestamptz', () => {
    expect(createScheduledAt('2026-07-14', '08:30:00')).toBe(
      '2026-07-14T00:30:00.000Z',
    );
  });

  it('按上海自然日生成数据库查询范围', () => {
    expect(getCareDayRange('2026-07-14')).toEqual({
      start: '2026-07-13T16:00:00.000Z',
      endExclusive: '2026-07-14T16:00:00.000Z',
    });
  });

  it('按上海时区计算日期与星期', () => {
    expect(getCareDateInfo(new Date('2026-07-13T16:30:00.000Z'))).toEqual({
      date: '2026-07-14',
      weekday: 2,
      time: '00:30',
    });
  });

  it('按自然日偏移并计算 ISO 星期', () => {
    expect(addCareDays('2026-07-14', -6)).toBe('2026-07-08');
    expect(getCareWeekday('2026-07-14')).toBe(2);
  });
});
