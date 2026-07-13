// ============================================================
// 桑梓智护 · 服务端共享底座 barrel
// ------------------------------------------------------------
// 业务 Route Handler 统一从 '@/lib/server' 引入共享能力。
// 仅服务端使用；禁止客户端 import。
// ============================================================

export {
  apiError,
  badRequest,
  forbidden,
  internalError,
  notFound,
  unauthorized,
  ApiError,
  throwApiError,
  toApiResponse,
  type ApiErrorBody,
} from './errors';

export { withPrivateNoStore } from './http';

export {
  createAccessToken,
  createRefreshToken,
  requireUser,
  verifyToken,
  type AccessTokenInput,
  type AuthUser,
  type RefreshTokenInput,
} from './auth';

export { getSupabaseServerClient } from './supabase';

export {
  getJwtAlgorithm,
  getJwtExpireMinutes,
  getJwtRefreshExpireDays,
  getJwtSecret,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from './env';

export {
  MimoError,
  synthesizeSpeech,
  transcribeSpeech,
  type MimoAudioFormat,
  type MimoErrorKind,
  type MimoVoice,
  type SynthesizedSpeech,
} from './mimo';

export {
  assertVoiceObjectPath,
  buildVoiceObjectPath,
  createSignedVoiceUrl,
  getVoiceBucketName,
  removeVoiceObject,
  uploadVoiceObject,
  type VoiceObjectKind,
} from './voice-storage';
