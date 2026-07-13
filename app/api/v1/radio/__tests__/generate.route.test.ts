// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const PATH = 'user-1/broadcasts/123e4567-e89b-42d3-a456-426614174000.mp3';
const SIGNED_URL = 'https://storage.test/signed-broadcast.mp3?token=short-lived';
const MP3 = new Uint8Array([0xff, 0xf3, 0x84, 0xc4]);

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  buildVoiceObjectPath: vi.fn(),
  createSignedVoiceUrl: vi.fn(),
  uploadVoiceObject: vi.fn(),
  removeVoiceObject: vi.fn(),
  generateBroadcastText: vi.fn(),
  generateAudio: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
  buildVoiceObjectPath: mocks.buildVoiceObjectPath,
  createSignedVoiceUrl: mocks.createSignedVoiceUrl,
  uploadVoiceObject: mocks.uploadVoiceObject,
  removeVoiceObject: mocks.removeVoiceObject,
}));

vi.mock('@/lib/server/broadcast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/broadcast')>()),
  generateBroadcastText: mocks.generateBroadcastText,
  generateAudio: mocks.generateAudio,
}));

const { ApiError } = await import('@/lib/server');
const { POST } = await import('../generate/route');

const ROW = {
  id: 'broadcast-1',
  title: '春季养生',
  content: '春季注意保暖。',
  category: '季节养生',
  audio_url: PATH,
  audio_duration: 3.6,
  play_count: 0,
  is_published: true,
  target_age_min: null,
  target_age_max: null,
  target_diseases: null,
  target_season: null,
  ai_prompt: 'prompt',
  generated_by: 'doubao',
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: '2026-07-13T00:00:00.000Z',
};

function createDatabase(
  result: { data: typeof ROW[] | null; error: unknown } = {
    data: [ROW],
    error: null,
  },
) {
  const select = vi.fn().mockResolvedValue(result);
  const insert = vi.fn(() => ({ select }));
  return {
    client: { from: vi.fn(() => ({ insert })) },
    insert,
  };
}

function request(): NextRequest {
  return new Request('http://localhost/api/v1/radio/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: '季节养生' }),
  }) as unknown as NextRequest;
}

describe('POST /api/v1/radio/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.buildVoiceObjectPath.mockReturnValue(PATH);
    mocks.createSignedVoiceUrl.mockResolvedValue(SIGNED_URL);
    mocks.uploadVoiceObject.mockResolvedValue(undefined);
    mocks.removeVoiceObject.mockResolvedValue(undefined);
    mocks.generateBroadcastText.mockResolvedValue({
      title: ROW.title,
      content: ROW.content,
      ai_prompt: ROW.ai_prompt,
    });
    mocks.generateAudio.mockResolvedValue({
      bytes: MP3,
      contentType: 'audio/mpeg',
      duration: ROW.audio_duration,
    });
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase().client);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('先上传私有 MP3，再把稳定对象路径作为已发布广播写入数据库', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.buildVoiceObjectPath).toHaveBeenCalledWith(
      'user-1',
      'broadcasts',
    );
    expect(mocks.uploadVoiceObject).toHaveBeenCalledWith(
      database.client,
      PATH,
      MP3,
      'audio/mpeg',
    );
    expect(database.insert).toHaveBeenCalledWith(expect.objectContaining({
      audio_url: PATH,
      audio_duration: 3.6,
      is_published: true,
    }));
    expect(mocks.uploadVoiceObject.mock.invocationCallOrder[0])
      .toBeLessThan(database.insert.mock.invocationCallOrder[0]);
    expect(mocks.createSignedVoiceUrl).toHaveBeenCalledWith(
      database.client,
      PATH,
      'broadcasts',
    );
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      audio_url: SIGNED_URL,
    }));
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('发布后签名暂时失败仍返回成功，但绝不把稳定对象路径暴露给客户端', async () => {
    mocks.createSignedVoiceUrl.mockRejectedValue(new Error('sign failed'));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.audio_url).toBeNull();
    expect(JSON.stringify(body)).not.toContain(PATH);
    expect(mocks.removeVoiceObject).not.toHaveBeenCalled();
  });

  it('Storage 失败时不写数据库，也不能返回伪发布成功', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    mocks.uploadVoiceObject.mockRejectedValue(
      new ApiError(503, '语音文件存储失败，请稍后重试'),
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(database.insert).not.toHaveBeenCalled();
  });

  it('数据库返回失败时补偿删除 MP3，并返回失败而非伪发布', async () => {
    const database = createDatabase({ data: null, error: new Error('db failed') });
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.removeVoiceObject).toHaveBeenCalledWith(database.client, PATH);
  });

  it('数据库抛错或空返回时同样补偿删除对象', async () => {
    const thrownInsert = vi.fn(() => {
      throw new Error('db unavailable');
    });
    const thrownClient = { from: vi.fn(() => ({ insert: thrownInsert })) };
    mocks.getSupabaseServerClient.mockReturnValueOnce(thrownClient);

    expect((await POST(request())).status).toBe(500);
    expect(mocks.removeVoiceObject).toHaveBeenCalledWith(thrownClient, PATH);

    const emptyDatabase = createDatabase({ data: [], error: null });
    mocks.getSupabaseServerClient.mockReturnValueOnce(emptyDatabase.client);
    expect((await POST(request())).status).toBe(500);
    expect(mocks.removeVoiceObject).toHaveBeenCalledWith(
      emptyDatabase.client,
      PATH,
    );
  });

  it('补偿删除失败不遮盖数据库主错误', async () => {
    const database = createDatabase({ data: null, error: new Error('db failed') });
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    mocks.removeVoiceObject.mockRejectedValue(new Error('cleanup failed'));

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ detail: '保存广播内容失败' });
  });
});
