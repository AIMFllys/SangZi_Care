import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { ApiError } from './errors';

export type VoiceObjectKind = 'messages' | 'broadcasts';

const SAFE_USER_ID = /^[A-Za-z0-9_-]+$/;
const SAFE_BUCKET = /^[a-z0-9][a-z0-9._-]{1,62}$/;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const OBJECT_PATHS: Record<VoiceObjectKind, RegExp> = {
  messages: new RegExp(`^([A-Za-z0-9_-]+)/messages/(${UUID})\\.wav$`, 'i'),
  broadcasts: new RegExp(`^([A-Za-z0-9_-]+)/broadcasts/(${UUID})\\.mp3$`, 'i'),
};

const EXTENSIONS: Record<VoiceObjectKind, 'wav' | 'mp3'> = {
  messages: 'wav',
  broadcasts: 'mp3',
};

export function getVoiceBucketName(): string {
  const bucket = process.env.SUPABASE_VOICE_BUCKET?.trim() ?? '';
  if (!SAFE_BUCKET.test(bucket)) {
    throw new ApiError(503, '私有语音存储未配置');
  }
  return bucket;
}

async function getPrivateVoiceBucketName(
  client: SupabaseClient<Database>,
): Promise<string> {
  const bucket = getVoiceBucketName();

  try {
    const { data, error } = await client.storage.getBucket(bucket);
    if (error || !data || data.public !== false) {
      throw new ApiError(503, '私有语音存储不可用');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, '私有语音存储不可用');
  }

  return bucket;
}

export function buildVoiceObjectPath(
  userId: string,
  kind: VoiceObjectKind,
  objectId = randomUUID(),
): string {
  if (!SAFE_USER_ID.test(userId) || !new RegExp(`^${UUID}$`, 'i').test(objectId)) {
    throw new ApiError(400, '语音对象路径参数非法');
  }
  return `${userId}/${kind}/${objectId}.${EXTENSIONS[kind]}`;
}

export function assertVoiceObjectPath(
  path: string,
  expectedUserId: string,
  kind: VoiceObjectKind,
): void {
  const match = OBJECT_PATHS[kind].exec(path);
  if (!match || match[1] !== expectedUserId) {
    throw new ApiError(400, '语音对象路径非法');
  }
}

export async function uploadVoiceObject(
  client: SupabaseClient<Database>,
  path: string,
  bytes: Uint8Array,
  contentType: 'audio/wav' | 'audio/mpeg',
): Promise<void> {
  const bucket = await getPrivateVoiceBucketName(client);
  const { error } = await client.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: false });

  if (error) throw new ApiError(503, '语音文件存储失败，请稍后重试');
}

export async function createSignedVoiceUrl(
  client: SupabaseClient<Database>,
  path: string,
): Promise<string> {
  const bucket = await getPrivateVoiceBucketName(client);
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, 600);

  if (error || !data?.signedUrl) {
    throw new ApiError(503, '语音文件暂时无法播放');
  }
  return data.signedUrl;
}

export async function removeVoiceObject(
  client: SupabaseClient<Database>,
  path: string,
): Promise<void> {
  const { error } = await client.storage
    .from(getVoiceBucketName())
    .remove([path]);

  if (error) throw new ApiError(503, '语音文件清理失败');
}
