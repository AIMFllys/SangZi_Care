// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const UUID = '123e4567-e89b-42d3-a456-426614174000';
const PATH = `user-2/messages/${UUID}.wav`;

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

const { PATCH } = await import('../[id]/read/route');

const VOICE_ROW = {
  id: 'voice-1',
  sender_id: 'user-2',
  receiver_id: 'user-1',
  type: 'voice',
  content: '语音转写',
  audio_url: PATH,
  audio_duration: 2,
  is_ai_generated: false,
  is_read: true,
  read_at: '2026-07-13T00:01:00Z',
  created_at: '2026-07-13T00:00:00Z',
};

function createDatabase() {
  const limit = vi.fn().mockResolvedValue({ data: [{ ...VOICE_ROW, is_read: false }], error: null });
  const selectEq = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const updateSelect = vi.fn().mockResolvedValue({ data: [VOICE_ROW], error: null });
  const updateEq = vi.fn(() => ({ select: updateSelect }));
  const update = vi.fn(() => ({ eq: updateEq }));
  return { client: { from: vi.fn(() => ({ select, update })) } };
}

describe('PATCH /api/v1/messages/:id/read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase().client);
  });

  it('标记语音已读时只返回同源鉴权播放地址，不泄露对象路径', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/v1/messages/voice-1/read', {
        method: 'PATCH',
      }) as unknown as NextRequest,
      { params: Promise.resolve({ id: 'voice-1' }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.audio_url).toBe('/api/v1/voice/audio?message_id=voice-1');
    expect(JSON.stringify(body)).not.toContain(PATH);
    expect(JSON.stringify(body)).not.toContain(UUID);
  });
});
