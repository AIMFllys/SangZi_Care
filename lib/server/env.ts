// ============================================================
// 桑梓智护 · 服务端环境变量读取与校验
// ------------------------------------------------------------
// 仅在服务端模块（app/api/**、lib/server/**）import。
// 切勿在客户端代码引用本文件，避免 secret 泄漏到客户端产物。
// ============================================================

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`缺少必需的服务端环境变量: ${name}`);
  }
  return v.trim();
}

/** JWT 签名密钥（仅服务端）。对齐 Python core.config.JWT_SECRET。 */
export function getJwtSecret(): string {
  return required('JWT_SECRET');
}

/** JWT 算法，默认 HS256。对齐 Python core.config.JWT_ALGORITHM。 */
export function getJwtAlgorithm(): string {
  return (process.env.JWT_ALGORITHM ?? 'HS256').trim();
}

/** Access token 过期分钟数，对齐 Python 默认 1440（24h）。 */
export function getJwtExpireMinutes(): number {
  const raw = Number(process.env.JWT_EXPIRE_MINUTES ?? '1440');
  if (!Number.isFinite(raw) || raw <= 0) return 1440;
  return raw;
}

/** Refresh token 过期天数，对齐 Python core.security.py 写死的 7 天。 */
export function getJwtRefreshExpireDays(): number {
  const raw = Number(process.env.JWT_REFRESH_EXPIRE_DAYS ?? '7');
  if (!Number.isFinite(raw) || raw <= 0) return 7;
  return raw;
}

/**
 * Supabase 项目 URL（public，可安全在服务端读取）。
 * 对齐 .env.example 的 NEXT_PUBLIC_SUPABASE_URL。
 */
export function getSupabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL');
}

/** Supabase secret key（sb_secret_...，仅服务端，绕过 RLS）。 */
export function getSupabaseSecretKey(): string {
  return required('SUPABASE_SECRET_KEY');
}
