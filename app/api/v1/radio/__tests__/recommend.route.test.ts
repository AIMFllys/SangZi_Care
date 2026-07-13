// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const PATH = 'user-1/broadcasts/123e4567-e89b-42d3-a456-426614174000.mp3';
const SIGNED_URL = 'https://storage.test/signed-broadcast.mp3?token=short-lived';

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
const { GET } = await import('../recommend/route');

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

type TestBroadcastRow = Omit<typeof ROW, 'audio_url'> & {
  audio_url: string | null;
};

function createDatabase(rows: TestBroadcastRow[] = [ROW]) {
  const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
  const order = vi.fn(() => ({ limit }));
  const or = vi.fn(() => ({ order }));
  const broadcastEq = vi.fn(() => ({ or, order }));
  const userEq = vi.fn().mockResolvedValue({
    data: [{
      id: 'listener-1',
      birth_date: '1950-01-01',
      chronic_diseases: [],
    }],
    error: null,
  });
  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: table === 'oc_users' ? userEq : broadcastEq,
      })),
    })),
  };
  return { client, limit };
}

function request(): NextRequest {
  return new NextRequest('http://localhost/api/v1/radio/recommend?limit=10');
}

describe('GET /api/v1/radio/recommend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'listener-1', role: 'elder' });
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase().client);
    mocks.createSignedVoiceUrl.mockResolvedValue(SIGNED_URL);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('鉴权后把数据库稳定路径替换为十分钟私有签名 URL', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.createSignedVoiceUrl).toHaveBeenCalledWith(
      database.client,
      PATH,
      'broadcasts',
    );
    const body = await response.json();
    expect(body).toEqual([
      expect.objectContaining({ id: ROW.id, audio_url: SIGNED_URL }),
    ]);
    expect(JSON.stringify(body)).not.toContain(PATH);
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toContain('Authorization');
  });

  it('没有音频路径的遗留广播保留 null，且不请求签名', async () => {
    mocks.getSupabaseServerClient.mockReturnValue(
      createDatabase([{ ...ROW, audio_url: null }]).client,
    );

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ audio_url: null }),
    ]);
    expect(mocks.createSignedVoiceUrl).not.toHaveBeenCalled();
  });

  it('签名失败返回安全 503，响应中不泄露稳定对象路径', async () => {
    mocks.createSignedVoiceUrl.mockRejectedValue(
      new ApiError(503, '语音文件暂时无法播放'),
    );

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).not.toContain(PATH);
  });

  it('未登录时不查数据库也不签名', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    mocks.requireUser.mockRejectedValue(new ApiError(401, '请先登录'));

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(database.client.from).not.toHaveBeenCalled();
    expect(mocks.createSignedVoiceUrl).not.toHaveBeenCalled();
  });
});
