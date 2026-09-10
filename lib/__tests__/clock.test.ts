import { describe, expect, it } from 'vitest';
import { formatShanghaiClock } from '../clock';

describe('formatShanghaiClock', () => {
  it('按上海时区格式化时间与星期，不跟随设备本地时区', () => {
    const clock = formatShanghaiClock(new Date('2026-09-11T15:05:00+12:00'));

    expect(clock.time).toBe('11:05');
    expect(clock.hour).toBe(11);
    expect(clock.date).toBe('9月11日 星期五');
  });

  it('周日映射为星期日', () => {
    const clock = formatShanghaiClock(new Date('2026-09-13T01:00:00+08:00'));

    expect(clock.date).toBe('9月13日 星期日');
    expect(clock.time).toBe('01:00');
  });
});
