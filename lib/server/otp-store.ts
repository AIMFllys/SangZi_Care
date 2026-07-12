// ============================================================
// 桑梓智护 · 服务端 OTP / CAPTCHA 进程内存储
// ------------------------------------------------------------
// ⚠️ EdgeOne 多实例风险（重要）：
// 本模块使用进程内 Map 存储 captcha 答案与邮箱验证码。
// EdgeOne Pages / Makers 在生产环境会横向扩展多个实例，
// 请求可能被负载均衡到不同实例 → 出现「验证码不存在」误报。
// 这与 Python 现状（单进程内存 dict）行为对齐，仅适合 MVP。
//
// 后续演进（任选其一，超出 plan 01 范围）：
//   1. Redis / Upstash Redis（推荐，TTL 原生支持）
//   2. Supabase 表存储（带过期时间字段 + 定时清理）
//   3. 直接改用 Supabase Auth（OTP 邮件能力，最彻底）
//
// 对齐 backend/api/v1/auth.py 的 _captcha_store / _verification_codes。
// ============================================================

// ---------- CAPTCHA ----------
// captcha_id -> { answer, expiry(ms) }
interface CaptchaEntry {
  answer: number;
  expiry: number; // epoch ms
}

const _captchaStore = new Map<string, CaptchaEntry>();

// ---------- 邮箱验证码 ----------
// email -> { code, expiry(ms), lastSend(ms) }
interface OtpEntry {
  code: string;
  expiry: number; // epoch ms
  lastSend: number; // epoch ms
}

const _otpStore = new Map<string, OtpEntry>();

// ---------- 过期时间常量（对齐 Python） ----------
export const CAPTCHA_EXPIRE_SECONDS = 120; // 2 分钟
export const CODE_EXPIRE_SECONDS = 300; // 5 分钟
export const RATE_LIMIT_SECONDS = 60; // 每邮箱 60s 一次

function nowMs(): number {
  return Date.now();
}

function cleanupExpiredCaptchas(): void {
  const now = nowMs();
  for (const [id, entry] of _captchaStore) {
    if (now > entry.expiry) _captchaStore.delete(id);
  }
}

function cleanupExpiredOtps(): void {
  const now = nowMs();
  for (const [email, entry] of _otpStore) {
    if (now > entry.expiry) _otpStore.delete(email);
  }
}

// ---------- CAPTCHA API ----------

/** 存入一条 captcha，返回 captcha_id。 */
export function putCaptcha(answer: number): string {
  cleanupExpiredCaptchas();
  const id = crypto.randomUUID();
  _captchaStore.set(id, {
    answer,
    expiry: nowMs() + CAPTCHA_EXPIRE_SECONDS * 1000,
  });
  return id;
}

/**
 * 取出并删除一条 captcha（一次性）。
 * 返回 entry 或 null（不存在）。
 * 调用方需自行检查 expiry 与 answer。
 */
export function consumeCaptcha(captchaId: string): CaptchaEntry | null {
  const entry = _captchaStore.get(captchaId);
  if (!entry) return null;
  _captchaStore.delete(captchaId); // 单次使用，无论答对与否
  return entry;
}

/** captcha 是否已过期。 */
export function isCaptchaExpired(entry: CaptchaEntry): boolean {
  return nowMs() > entry.expiry;
}

// ---------- 邮箱验证码 API ----------

/**
 * 检查限流：距离上次发送是否不足 RATE_LIMIT_SECONDS。
 * 返回还需等待的秒数（0 表示可发送）。
 */
export function getRateLimitRemaining(email: string): number {
  cleanupExpiredOtps();
  const entry = _otpStore.get(email);
  if (!entry) return 0;
  const elapsed = (nowMs() - entry.lastSend) / 1000;
  if (elapsed < RATE_LIMIT_SECONDS) {
    return Math.ceil(RATE_LIMIT_SECONDS - elapsed);
  }
  return 0;
}

/** 存入一条邮箱验证码（覆盖旧值）。 */
export function putOtp(email: string, code: string): void {
  const now = nowMs();
  _otpStore.set(email, {
    code,
    expiry: now + CODE_EXPIRE_SECONDS * 1000,
    lastSend: now,
  });
}

/** 邮箱验证码失败时回滚（删除）。 */
export function removeOtp(email: string): void {
  _otpStore.delete(email);
}

/**
 * 校验并消费验证码（一次性）。
 * 返回：
 *   - 'ok'           匹配
 *   - 'not_found'    无记录
 *   - 'expired'      已过期
 *   - 'mismatch'     不匹配
 */
export type OtpVerifyResult = 'ok' | 'not_found' | 'expired' | 'mismatch';
export function consumeOtp(email: string, code: string): OtpVerifyResult {
  const entry = _otpStore.get(email);
  if (!entry) return 'not_found';
  if (nowMs() > entry.expiry) {
    _otpStore.delete(email);
    return 'expired';
  }
  if (entry.code !== code) return 'mismatch';
  _otpStore.delete(email);
  return 'ok';
}
