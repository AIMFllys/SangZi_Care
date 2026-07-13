// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const UUID = '123e4567-e89b-42d3-a456-426614174000';
const PATH = `user-2/messages/${UUID}.wav`;

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  createSignedVoiceUrl: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
  createSignedVoiceUrl: mocks.createSignedVoiceUrl,
}));

const { ApiError } = await import('@/lib/server');
const { GET } = await import('../audio/route');

const ROW = {
  id: 'voice-1',
  sender_id: 'user-2',
  receiver_id: 'user-1',
  type: 'voice',
  audio_url: PATH,
};

function createDatabase(result = { data: ROW as typeof ROW | null, error: null as unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { client: { from: vi.fn(() => ({ select })) }, select, eq, maybeSingle };
}

function request(messageId = 'voice-1'): NextRequest {
  return new Request(
    `http://localhost/api/v1/voice/audio?message_id=${encodeURIComponent(messageId)}`,
  ) as unknown as NextRequest;
}

describe('GET /api/v1/voice/audio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase().client);
    mocks.createSignedVoiceUrl.mockResolvedValue('https://storage.test/signed-token');
  });

  it('要求登录和安全 message_id', async () => {
    mocks.requireUser.mockRejectedValueOnce(new ApiError(401, 'Missing authentication token'));
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request(''))).status).toBe(400);
    expect((await GET(request('../other'))).status).toBe(400);
  });

  it('消息不存在返回 404，数据库失败返回 500', async () => {
    mocks.getSupabaseServerClient.mockReturnValueOnce(createDatabase({ data: null, error: null }).client);
    expect((await GET(request())).status).toBe(404);
    mocks.getSupabaseServerClient.mockReturnValueOnce(createDatabase({
      data: null,
      error: new Error('db failed'),
    }).client);
    expect((await GET(request())).status).toBe(500);
  });

  it('陌生用户不能取得签名地址', async () => {
    mocks.requireUser.mockResolvedValue({ user_id: 'stranger', role: 'family' });
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(mocks.createSignedVoiceUrl).not.toHaveBeenCalled();
  });

  it('非语音消息或缺失对象路径不可播放', async () => {
    mocks.getSupabaseServerClient.mockReturnValueOnce(createDatabase({
      data: { ...ROW, type: 'text' }, error: null,
    }).client);
    expect((await GET(request())).status).toBe(404);
    mocks.getSupabaseServerClient.mockReturnValueOnce(createDatabase({
      data: { ...ROW, audio_url: '' }, error: null,
    }).client);
    expect((await GET(request())).status).toBe(404);
  });

  it.each([
    ['跨 sender 路径', `user-1/messages/${UUID}.wav`],
    ['外部 URL', 'https://evil.test/audio.wav'],
    ['路径穿越', `user-2/messages/../${UUID}.wav`],
    ['非 UUID 文件名', 'user-2/messages/not-a-uuid.wav'],
    ['错误扩展名', `user-2/messages/${UUID}.mp3`],
  ])('拒绝%s', async (_label, audioUrl) => {
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase({
      data: { ...ROW, audio_url: audioUrl }, error: null,
    }).client);

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(mocks.createSignedVoiceUrl).not.toHaveBeenCalled();
  });

  it('参与会话的接收方获得十分钟签名重定向且不缓存', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://storage.test/signed-token');
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toContain('Authorization');
    expect(mocks.createSignedVoiceUrl).toHaveBeenCalledWith(database.client, PATH);
  });

  it('参与会话的发送方也能获得同一鉴权播放重定向', async () => {
    mocks.requireUser.mockResolvedValue({ user_id: 'user-2', role: 'family' });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://storage.test/signed-token');
  });
});
