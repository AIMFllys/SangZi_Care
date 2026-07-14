import { describe, expect, it } from 'vitest';
import { buildUserUpdate } from '../_profile';

describe('buildUserUpdate', () => {
  it('接受数据库性别枚举与有效出生日期', () => {
    expect(buildUserUpdate({
      name: ' 张三 ',
      gender: 'male',
      birth_date: '1950-05-15',
    })).toEqual({
      name: '张三',
      gender: 'male',
      birth_date: '1950-05-15',
    });
  });

  it('拒绝旧中文性别值，避免数据库约束被包装成 500', () => {
    expect(() => buildUserUpdate({ gender: '男' })).toThrow(
      'gender 必须为 male、female、other 或 null',
    );
  });

  it('允许显式清空性别与出生日期', () => {
    expect(buildUserUpdate({ gender: null, birth_date: null })).toEqual({
      gender: null,
      birth_date: null,
    });
  });

  it('拒绝不存在的日期', () => {
    expect(() => buildUserUpdate({ birth_date: '2026-02-30' })).toThrow(
      'birth_date 必须为有效的 YYYY-MM-DD 日期或 null',
    );
  });
});
