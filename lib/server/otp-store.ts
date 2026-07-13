// ============================================================
// 桑梓智护 · 服务端 OTP / CAPTCHA 原子存储
// ------------------------------------------------------------
// 挑战只通过 SECURITY DEFINER RPC 访问 Supabase。邮箱、答案和 OTP
// 都先用由 JWT_SECRET 进行域分离派生的 pepper 做 HMAC；数据库中
// 不保存这些低熵或可识别的原始值。
// ============================================================

import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { ApiError } from './errors';
import { getJwtSecret } from './env';
import { getSupabaseServerClient } from './supabase';
import type { Database } from '@/types/supabase';

export const CAPTCHA_EXPIRE_SECONDS = 120;
export const CODE_EXPIRE_SECONDS = 300;
export const RATE_LIMIT_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

const CHALLENGE_UNAVAILABLE_DETAIL = '登录验证服务暂时不可用';
const PEPPER_DERIVATION_DOMAIN =
  'sangzi-smart-care/auth-challenge/pepper/v1';
const CAPTCHA_SECRET_DOMAIN =
  'sangzi-smart-care/auth-challenge/captcha-secret/v1';
const OTP_LOOKUP_DOMAIN =
  'sangzi-smart-care/auth-challenge/otp-lookup/v1';
const OTP_SECRET_DOMAIN =
  'sangzi-smart-care/auth-challenge/otp-secret/v1';

type ChallengeRpcName =
  | 'oc_auth_challenge_put_captcha'
  | 'oc_auth_challenge_consume_captcha'
  | 'oc_auth_challenge_reserve_otp'
  | 'oc_auth_challenge_activate_otp'
  | 'oc_auth_challenge_rollback_otp'
  | 'oc_auth_challenge_consume_otp';

type RpcArgument = string | number;

type ChallengeRpcArgs<Name extends ChallengeRpcName> =
  Database['public']['Functions'][Name]['Args'];

type ChallengeRpcResult<Name extends ChallengeRpcName> =
  Database['public']['Functions'][Name]['Returns'];

export type CaptchaConsumeResult =
  | 'ok'
  | 'not_found'
  | 'expired'
  | 'mismatch';

export type OtpReserveResult =
  | { status: 'ok'; version: string }
  | { status: 'rate_limited'; retryAfter: number };

export type OtpVerifyResult =
  | 'ok'
  | 'not_found'
  | 'expired'
  | 'mismatch'
  | 'locked';

function challengeUnavailable(): ApiError {
  return new ApiError(503, CHALLENGE_UNAVAILABLE_DETAIL);
}

function deriveChallengePepper(): Buffer {
  return createHmac('sha256', getJwtSecret())
    .update(PEPPER_DERIVATION_DOMAIN, 'utf8')
    .digest();
}

function digestChallenge(domain: string, ...values: string[]): string {
  const digest = createHmac('sha256', deriveChallengePepper());
  digest.update(domain, 'utf8');
  for (const value of values) {
    digest.update('\0', 'utf8');
    digest.update(value, 'utf8');
  }
  return digest.digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function otpLookupKey(email: string): string {
  return digestChallenge(OTP_LOOKUP_DOMAIN, normalizeEmail(email));
}

function otpSecretDigest(lookupKey: string, code: string): string {
  return digestChallenge(OTP_SECRET_DOMAIN, lookupKey, code);
}

async function callChallengeRpc<Name extends ChallengeRpcName>(
  name: Name,
  args: ChallengeRpcArgs<Name> & Record<string, RpcArgument>,
): Promise<ChallengeRpcResult<Name>> {
  try {
    const { data, error } = await getSupabaseServerClient().rpc(name, args);
    if (error) throw challengeUnavailable();
    return data as ChallengeRpcResult<Name>;
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) throw error;
    throw challengeUnavailable();
  }
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

/** 存入一条 CAPTCHA，并只返回不可预测的随机查找 ID。 */
export async function putCaptcha(answer: number): Promise<string> {
  const captchaId = randomUUID();
  const secretDigest = digestChallenge(
    CAPTCHA_SECRET_DOMAIN,
    captchaId,
    String(answer),
  );

  await callChallengeRpc('oc_auth_challenge_put_captcha', {
    p_lookup_key: captchaId,
    p_secret_digest: secretDigest,
    p_ttl_seconds: CAPTCHA_EXPIRE_SECONDS,
  });

  return captchaId;
}

/** 在数据库事务中一次性校验并消费 CAPTCHA。 */
export async function consumeCaptcha(
  captchaId: string,
  answer: number,
): Promise<CaptchaConsumeResult> {
  const result = await callChallengeRpc(
    'oc_auth_challenge_consume_captcha',
    {
      p_lookup_key: captchaId,
      p_secret_digest: digestChallenge(
        CAPTCHA_SECRET_DOMAIN,
        captchaId,
        String(answer),
      ),
    },
  );

  if (isOneOf(result, ['ok', 'not_found', 'expired', 'mismatch'] as const)) {
    return result;
  }
  throw challengeUnavailable();
}

/** 生成 000000—999999 的六位密码学随机验证码。 */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * 原子检查全局限流并预留新 OTP。预留版本用于后续激活/回滚，
 * 防止较早的慢请求覆盖或删除较新的验证码。
 */
export async function reserveOtp(
  email: string,
  code: string,
): Promise<OtpReserveResult> {
  const lookupKey = otpLookupKey(email);
  const result = await callChallengeRpc('oc_auth_challenge_reserve_otp', {
    p_lookup_key: lookupKey,
    p_secret_digest: otpSecretDigest(lookupKey, code),
    p_ttl_seconds: CODE_EXPIRE_SECONDS,
    p_rate_limit_seconds: RATE_LIMIT_SECONDS,
  });

  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw challengeUnavailable();
  }

  const payload = result as Record<string, unknown>;
  if (payload.status === 'ok' && typeof payload.version === 'string') {
    return { status: 'ok', version: payload.version };
  }
  if (
    payload.status === 'rate_limited'
    && typeof payload.retry_after === 'number'
    && Number.isFinite(payload.retry_after)
    && payload.retry_after >= 0
  ) {
    return {
      status: 'rate_limited',
      retryAfter: Math.ceil(payload.retry_after),
    };
  }
  throw challengeUnavailable();
}

/** 仅激活仍与该预留版本相同且尚未过期的 OTP。 */
export async function activateOtp(
  email: string,
  version: string,
): Promise<boolean> {
  const result = await callChallengeRpc('oc_auth_challenge_activate_otp', {
    p_lookup_key: otpLookupKey(email),
    p_version: version,
  });
  if (typeof result !== 'boolean') throw challengeUnavailable();
  return result;
}

/** 仅回滚仍与该预留版本相同的 OTP，不会删除较新的请求。 */
export async function rollbackOtp(
  email: string,
  version: string,
): Promise<boolean> {
  const result = await callChallengeRpc('oc_auth_challenge_rollback_otp', {
    p_lookup_key: otpLookupKey(email),
    p_version: version,
  });
  if (typeof result !== 'boolean') throw challengeUnavailable();
  return result;
}

/** 在数据库事务中校验、计数、锁定并一次性消费 OTP。 */
export async function consumeOtp(
  email: string,
  code: string,
): Promise<OtpVerifyResult> {
  const lookupKey = otpLookupKey(email);
  const result = await callChallengeRpc('oc_auth_challenge_consume_otp', {
    p_lookup_key: lookupKey,
    p_secret_digest: otpSecretDigest(lookupKey, code),
    p_max_attempts: OTP_MAX_ATTEMPTS,
  });

  if (
    isOneOf(
      result,
      ['ok', 'not_found', 'expired', 'mismatch', 'locked'] as const,
    )
  ) {
    return result;
  }
  throw challengeUnavailable();
}
