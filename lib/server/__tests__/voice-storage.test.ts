// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../errors';
import {
  assertVoiceObjectPath,
  buildVoiceObjectPath,
  createSignedVoiceUrl,
  getVoiceBucketName,
  removeVoiceObject,
  uploadVoiceObject,
} from '../voice-storage';

const UUID = '123e4567-e89b-42d3-a456-426614174000';

function createClient() {
  const bucket = {
    upload: vi.fn(),
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
  };
  const getBucket = vi.fn().mockResolvedValue({
    data: { id: 'voice-audio', name: 'voice-audio', public: false },
    error: null,
  });
  return {
    bucket,
    getBucket,
    client: {
      storage: {
        getBucket,
        from: vi.fn(() => bucket),
      },
    },
  };
}

describe('private voice storage', () => {
  const previousBucket = process.env.SUPABASE_VOICE_BUCKET;

  beforeEach(() => {
    process.env.SUPABASE_VOICE_BUCKET = 'voice-audio';
  });

  afterEach(() => {
    if (previousBucket === undefined) delete process.env.SUPABASE_VOICE_BUCKET;
    else process.env.SUPABASE_VOICE_BUCKET = previousBucket;
    vi.restoreAllMocks();
  });

  it('生产必须显式配置私有 bucket', () => {
    delete process.env.SUPABASE_VOICE_BUCKET;
    expect(() => getVoiceBucketName()).toThrowError(ApiError);
    try {
      getVoiceBucketName();
    } catch (error) {
      expect(error).toMatchObject({ status: 503 });
    }
  });

  it('只生成稳定的用户消息和广播对象路径', () => {
    expect(buildVoiceObjectPath('user-1', 'messages', UUID))
      .toBe(`user-1/messages/${UUID}.wav`);
    expect(buildVoiceObjectPath('user-1', 'broadcasts', UUID))
      .toBe(`user-1/broadcasts/${UUID}.mp3`);
    expect(() => buildVoiceObjectPath('../other', 'messages', UUID)).toThrow();
  });

  it('拒绝外部 URL、路径穿越、跨用户和错误扩展名', () => {
    for (const path of [
      'https://evil.test/a.wav',
      'user-1/messages/../a.wav',
      `user-2/messages/${UUID}.wav`,
      `user-1/messages/${UUID}.mp3`,
    ]) {
      expect(() => assertVoiceObjectPath(path, 'user-1', 'messages')).toThrow();
    }
    expect(assertVoiceObjectPath(
      `user-1/messages/${UUID}.wav`,
      'user-1',
      'messages',
    )).toBeUndefined();
  });

  it('上传禁止覆盖并保留精确 MIME', async () => {
    const { client, bucket } = createClient();
    bucket.upload.mockResolvedValue({ data: { path: `user-1/messages/${UUID}.wav` }, error: null });
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]);

    await uploadVoiceObject(
      client as never,
      `user-1/messages/${UUID}.wav`,
      bytes,
      'audio/wav',
    );

    expect(client.storage.from).toHaveBeenCalledWith('voice-audio');
    expect(bucket.upload).toHaveBeenCalledWith(
      `user-1/messages/${UUID}.wav`,
      bytes,
      { contentType: 'audio/wav', upsert: false },
    );
  });

  it('公开 bucket 在上传前返回安全 503', async () => {
    const { client, bucket, getBucket } = createClient();
    getBucket.mockResolvedValue({
      data: { id: 'voice-audio', name: 'voice-audio', public: true },
      error: null,
    });
    bucket.upload.mockResolvedValue({ data: { path: 'unexpected' }, error: null });

    await expect(uploadVoiceObject(
      client as never,
      `user-1/messages/${UUID}.wav`,
      new Uint8Array([1]),
      'audio/wav',
    )).rejects.toMatchObject({
      status: 503,
      detail: '私有语音存储不可用',
    });
    expect(bucket.upload).not.toHaveBeenCalled();
  });

  it('bucket 不存在时安全返回 503', async () => {
    const missing = createClient();
    missing.getBucket.mockResolvedValue({ data: null, error: new Error('not found') });
    missing.bucket.upload.mockResolvedValue({ data: { path: 'unexpected' }, error: null });

    await expect(uploadVoiceObject(
      missing.client as never,
      `user-1/messages/${UUID}.wav`,
      new Uint8Array([1]),
      'audio/wav',
    )).rejects.toMatchObject({
      status: 503,
      detail: '私有语音存储不可用',
    });
    expect(missing.bucket.upload).not.toHaveBeenCalled();
  });

  it('bucket 元数据查询抛错时安全返回 503', async () => {
    const unavailable = createClient();
    unavailable.getBucket.mockRejectedValue(new Error('network details'));
    unavailable.bucket.upload.mockResolvedValue({ data: { path: 'unexpected' }, error: null });

    await expect(uploadVoiceObject(
      unavailable.client as never,
      `user-1/messages/${UUID}.wav`,
      new Uint8Array([1]),
      'audio/wav',
    )).rejects.toMatchObject({
      status: 503,
      detail: '私有语音存储不可用',
    });
    expect(unavailable.bucket.upload).not.toHaveBeenCalled();
  });

  it('存储失败映射为 503，不能伪装上传成功', async () => {
    const { client, bucket } = createClient();
    bucket.upload.mockResolvedValue({ data: null, error: new Error('denied') });

    await expect(uploadVoiceObject(
      client as never,
      `user-1/messages/${UUID}.wav`,
      new Uint8Array([1]),
      'audio/wav',
    )).rejects.toMatchObject({
      status: 503,
      detail: '语音文件存储失败，请稍后重试',
    });
  });

  it('公开 bucket 在签名前返回安全 503', async () => {
    const { client, bucket, getBucket } = createClient();
    getBucket.mockResolvedValue({
      data: { id: 'voice-audio', name: 'voice-audio', public: true },
      error: null,
    });
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.test/should-not-leak' },
      error: null,
    });

    await expect(createSignedVoiceUrl(
      client as never,
      `user-1/messages/${UUID}.wav`,
    )).rejects.toMatchObject({
      status: 503,
      detail: '私有语音存储不可用',
    });
    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
  });

  it('补偿删除不被 bucket 隐私查询阻塞', async () => {
    const { client, bucket, getBucket } = createClient();
    getBucket.mockRejectedValue(new Error('privacy lookup unavailable'));
    bucket.remove.mockResolvedValue({ data: [], error: null });

    await expect(removeVoiceObject(
      client as never,
      `user-1/messages/${UUID}.wav`,
    )).resolves.toBeUndefined();
    expect(getBucket).not.toHaveBeenCalled();
    expect(bucket.remove).toHaveBeenCalledWith([`user-1/messages/${UUID}.wav`]);
  });

  it('签名 URL 固定十分钟且删除用于失败补偿', async () => {
    const { client, bucket } = createClient();
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.test/signed' },
      error: null,
    });
    bucket.remove.mockResolvedValue({ data: [], error: null });
    const path = `user-1/messages/${UUID}.wav`;

    await expect(createSignedVoiceUrl(client as never, path))
      .resolves.toBe('https://storage.test/signed');
    await removeVoiceObject(client as never, path);

    expect(bucket.createSignedUrl).toHaveBeenCalledWith(path, 600);
    expect(bucket.remove).toHaveBeenCalledWith([path]);
  });
});
