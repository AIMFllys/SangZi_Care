// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const UUID = '123e4567-e89b-42d3-a456-426614174000';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  resolveMessagePeer: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

vi.mock('../_lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_lib')>()),
  resolveMessagePeer: mocks.resolveMessagePeer,
}));

const { GET } = await import('../[id]/route');

const ROWS = [
  {
    id: 'voice-1', sender_id: 'user-1', receiver_id: 'user-2', type: 'voice',
    content: '语音转写', audio_url: `user-1/messages/${UUID}.wav`, audio_duration: 2,
    is_ai_generated: false, is_read: false, read_at: null, created_at: '2026-07-13T00:00:00Z',
  },
  {
    id: 'text-1', sender_id: 'user-2', receiver_id: 'user-1', type: 'text',
    content: '你好', audio_url: 'https://evil.test/leak.wav', audio_duration: null,
    is_ai_generated: false, is_read: true, read_at: null, created_at: '2026-07-13T00:01:00Z',
  },
  {
    id: 'text-2', sender_id: 'user-1', receiver_id: 'user-2', type: 'text',
    content: '遗留路径', audio_url: `user-1/messages/${UUID}.wav`, audio_duration: null,
    is_ai_generated: false, is_read: true, read_at: null, created_at: '2026-07-13T00:02:00Z',
  },
  {
    id: 'voice-empty', sender_id: 'user-2', receiver_id: 'user-1', type: 'voice',
    content: '缺失录音', audio_url: '', audio_duration: 1,
    is_ai_generated: false, is_read: true, read_at: null, created_at: '2026-07-13T00:03:00Z',
  },
];

function createDatabase(result = { data: ROWS, error: null as unknown }) {
  const range = vi.fn().mockResolvedValue(result);
  const order = vi.fn(() => ({ range }));
  const or = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ or }));
  return { client: { from: vi.fn(() => ({ select })) }, range };
}

function request(): NextRequest {
  return new NextRequest('http://localhost/api/v1/messages/user-2?limit=50&offset=0');
}

describe('GET /api/v1/messages/:peer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.resolveMessagePeer.mockResolvedValue(undefined);
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase().client);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('把私有路径替换为同源鉴权播放地址并禁止缓存', async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: 'user-2' }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'voice-1',
        audio_url: '/api/v1/voice/audio?message_id=voice-1',
      }),
      expect.objectContaining({ id: 'text-1', audio_url: null }),
      expect.objectContaining({ id: 'text-2', audio_url: null }),
      expect.objectContaining({ id: 'voice-empty', audio_url: null }),
    ]);
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toContain('Authorization');
  });

  it('数据库错误不泄露对象路径', async () => {
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase({
      data: [], error: new Error(`failed ${UUID}`),
    }).client);
    const response = await GET(request(), { params: Promise.resolve({ id: 'user-2' }) });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(UUID);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(UUID);
    expect(response.headers.get('cache-control'))
      .toBe('private, no-store, max-age=0');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('vary')).toBe('Authorization');
  });
});
