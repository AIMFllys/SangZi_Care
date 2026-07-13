// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const BUCKET = 'voice-audio';
const PATH = 'user-1/broadcasts/123e4567-e89b-42d3-a456-426614174000.mp3';
const SECOND_PATH = 'user-2/broadcasts/123e4567-e89b-42d3-a456-426614174001.mp3';
const SIGNED_URL = 'https://storage.test/signed-broadcast-1.mp3?token=short-lived';
const SECOND_SIGNED_URL = 'https://storage.test/signed-broadcast-2.mp3?token=short-lived';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  getVoiceBucketName: vi.fn(),
  createSignedVoiceUrl: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
  getVoiceBucketName: mocks.getVoiceBucketName,
  // 保留旧 helper 的隔离桩，用于证明推荐路由不再逐条调用它。
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

interface SignedResult {
  error: string | null;
  path: string | null;
  signedUrl: string;
}

function defaultSignedUrl(path: string): string {
  if (path === PATH) return SIGNED_URL;
  if (path === SECOND_PATH) return SECOND_SIGNED_URL;
  return `https://storage.test/signed-${encodeURIComponent(path)}?token=short-lived`;
}

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
  const getBucket = vi.fn().mockResolvedValue({
    data: { id: BUCKET, name: BUCKET, public: false },
    error: null,
  });
  const createSignedUrls = vi.fn().mockImplementation(async (paths: string[]) => ({
    data: paths.map((path): SignedResult => ({
      error: null,
      path,
      signedUrl: defaultSignedUrl(path),
    })),
    error: null,
  }));
  const storageFrom = vi.fn(() => ({ createSignedUrls }));
  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: table === 'oc_users' ? userEq : broadcastEq,
      })),
    })),
    storage: {
      getBucket,
      from: storageFrom,
    },
  };
  return {
    client,
    limit,
    getBucket,
    storageFrom,
    createSignedUrls,
  };
}

function request(limit = 10): NextRequest {
  return new NextRequest(`http://localhost/api/v1/radio/recommend?limit=${limit}`);
}

describe('GET /api/v1/radio/recommend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'listener-1', role: 'elder' });
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase().client);
    mocks.getVoiceBucketName.mockReturnValue(BUCKET);
    mocks.createSignedVoiceUrl.mockResolvedValue(SIGNED_URL);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('一次验证私有 bucket，并一次批量签名所有广播路径', async () => {
    const rows = [
      ROW,
      { ...ROW, id: 'broadcast-2', audio_url: SECOND_PATH },
      { ...ROW, id: 'broadcast-without-audio', audio_url: null },
    ];
    const database = createDatabase(rows);
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(database.getBucket).toHaveBeenCalledOnce();
    expect(database.getBucket).toHaveBeenCalledWith(BUCKET);
    expect(database.storageFrom).toHaveBeenCalledOnce();
    expect(database.storageFrom).toHaveBeenCalledWith(BUCKET);
    expect(database.createSignedUrls).toHaveBeenCalledOnce();
    expect(database.createSignedUrls).toHaveBeenCalledWith(
      [PATH, SECOND_PATH],
      600,
    );
    expect(mocks.createSignedVoiceUrl).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ id: ROW.id, audio_url: SIGNED_URL }),
      expect.objectContaining({ id: 'broadcast-2', audio_url: SECOND_SIGNED_URL }),
      expect.objectContaining({ id: 'broadcast-without-audio', audio_url: null }),
    ]);
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toContain('Authorization');
  });

  it('50 条可播放广播仍只产生两次 Storage 请求', async () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({
      ...ROW,
      id: `broadcast-${index}`,
      audio_url: `user-${index}/broadcasts/123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}.mp3`,
    }));
    const database = createDatabase(rows);
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request(50));

    expect(response.status).toBe(200);
    expect(database.getBucket).toHaveBeenCalledOnce();
    expect(database.createSignedUrls).toHaveBeenCalledOnce();
    expect(database.createSignedUrls.mock.calls[0][0]).toHaveLength(50);
    expect(mocks.createSignedVoiceUrl).not.toHaveBeenCalled();
  });

  it('按 Storage 返回的 path 映射签名，不能依赖返回顺序', async () => {
    const database = createDatabase([
      ROW,
      { ...ROW, id: 'broadcast-2', audio_url: SECOND_PATH },
    ]);
    database.createSignedUrls.mockResolvedValue({
      data: [
        { error: null, path: SECOND_PATH, signedUrl: SECOND_SIGNED_URL },
        { error: null, path: PATH, signedUrl: SIGNED_URL },
      ],
      error: null,
    });
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ id: ROW.id, audio_url: SIGNED_URL }),
      expect.objectContaining({ id: 'broadcast-2', audio_url: SECOND_SIGNED_URL }),
    ]);
  });

  it('没有音频路径的遗留广播保留 null，且不访问 Storage', async () => {
    const database = createDatabase([{ ...ROW, audio_url: null }]);
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ audio_url: null }),
    ]);
    expect(database.getBucket).not.toHaveBeenCalled();
    expect(database.createSignedUrls).not.toHaveBeenCalled();
    expect(mocks.createSignedVoiceUrl).not.toHaveBeenCalled();
  });

  it('任一数据库音频路径非法时在访问 Storage 前安全失败', async () => {
    const unsafePath = 'https://evil.test/private-audio.mp3';
    const database = createDatabase([{ ...ROW, audio_url: unsafePath }]);
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(database.getBucket).not.toHaveBeenCalled();
    expect(database.createSignedUrls).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).not.toContain(unsafePath);
  });

  it('公开 bucket 安全失败，且不执行批量签名', async () => {
    const database = createDatabase();
    database.getBucket.mockResolvedValue({
      data: { id: BUCKET, name: BUCKET, public: true },
      error: null,
    });
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(database.getBucket).toHaveBeenCalledOnce();
    expect(database.createSignedUrls).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(PATH);
  });

  it('批量签名缺项或返回未知 path 时安全失败，不错配到其他广播', async () => {
    const unknownPath = 'other/broadcasts/123e4567-e89b-42d3-a456-426614174099.mp3';
    const database = createDatabase([
      ROW,
      { ...ROW, id: 'broadcast-2', audio_url: SECOND_PATH },
    ]);
    database.createSignedUrls.mockResolvedValue({
      data: [
        { error: null, path: PATH, signedUrl: SIGNED_URL },
        { error: null, path: unknownPath, signedUrl: SECOND_SIGNED_URL },
      ],
      error: null,
    });
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request());

    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain(PATH);
    expect(text).not.toContain(SECOND_PATH);
    expect(text).not.toContain(unknownPath);
  });

  it('任一批量签名条目失败时返回安全 503', async () => {
    const database = createDatabase();
    database.createSignedUrls.mockResolvedValue({
      data: [{ error: 'not found', path: PATH, signedUrl: '' }],
      error: null,
    });
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).not.toContain(PATH);
  });

  it('未登录时不查数据库也不访问 Storage', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    mocks.requireUser.mockRejectedValue(new ApiError(401, '请先登录'));

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(database.client.from).not.toHaveBeenCalled();
    expect(database.getBucket).not.toHaveBeenCalled();
    expect(database.createSignedUrls).not.toHaveBeenCalled();
    expect(mocks.createSignedVoiceUrl).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
