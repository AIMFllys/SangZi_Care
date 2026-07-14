import { ApiError } from '@/lib/server';
import type { Database } from '@/types/supabase';

type UserUpdate = Database['public']['Tables']['oc_users']['Update'];

const GENDERS = new Set(['male', 'female', 'other']);
const FONT_SIZES = new Set(['normal', 'large', 'xlarge']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseNullableString(
  value: unknown,
  field: string,
): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} 必须为字符串或 null`);
  }
  return value;
}

/** 资料更新白名单与数据库约束的服务端前置校验。 */
export function buildUserUpdate(body: unknown): UserUpdate {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, '请求体格式不正确');
  }

  const raw = body as Record<string, unknown>;
  const update: UserUpdate = {};

  if ('name' in raw) {
    if (typeof raw.name !== 'string' || raw.name.trim() === '') {
      throw new ApiError(400, 'name 必须为非空字符串');
    }
    update.name = raw.name.trim();
  }

  if ('avatar_url' in raw) {
    update.avatar_url = parseNullableString(raw.avatar_url, 'avatar_url');
  }

  if ('birth_date' in raw) {
    if (raw.birth_date === null) {
      update.birth_date = null;
    } else if (typeof raw.birth_date === 'string' && isRealDate(raw.birth_date)) {
      update.birth_date = raw.birth_date;
    } else {
      throw new ApiError(400, 'birth_date 必须为有效的 YYYY-MM-DD 日期或 null');
    }
  }

  if ('gender' in raw) {
    if (raw.gender === null) {
      update.gender = null;
    } else if (typeof raw.gender === 'string' && GENDERS.has(raw.gender)) {
      update.gender = raw.gender;
    } else {
      throw new ApiError(400, 'gender 必须为 male、female、other 或 null');
    }
  }

  if ('chronic_diseases' in raw) {
    if (
      !Array.isArray(raw.chronic_diseases)
      || !raw.chronic_diseases.every((item) => typeof item === 'string')
    ) {
      throw new ApiError(400, 'chronic_diseases 必须为字符串数组');
    }
    update.chronic_diseases = raw.chronic_diseases
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if ('font_size' in raw) {
    if (raw.font_size === null) {
      update.font_size = null;
    } else if (typeof raw.font_size === 'string' && FONT_SIZES.has(raw.font_size)) {
      update.font_size = raw.font_size;
    } else {
      throw new ApiError(400, 'font_size 必须为 normal、large、xlarge 或 null');
    }
  }

  if ('wake_word' in raw) {
    update.wake_word = parseNullableString(raw.wake_word, 'wake_word');
  }

  if ('voice_speed' in raw) {
    if (
      typeof raw.voice_speed !== 'number'
      || !Number.isFinite(raw.voice_speed)
      || raw.voice_speed < 0.5
      || raw.voice_speed > 2
    ) {
      throw new ApiError(400, 'voice_speed 必须为 0.5–2 之间的数字');
    }
    update.voice_speed = raw.voice_speed;
  }

  return update;
}
