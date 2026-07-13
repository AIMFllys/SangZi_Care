// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { encodePcm16Wav } from '@/lib/audio/wav';

const UUID = '123e4567-e89b-42d3-a456-426614174000';
const PATH = `user-1/messages/${UUID}.wav`;

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  resolveMessagePeer: vi.fn(),
  buildVoiceObjectPath: vi.fn(),
  uploadVoiceObject: vi.fn(),
  removeVoiceObject: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
  buildVoiceObjectPath: mocks.buildVoiceObjectPath,
  uploadVoiceObject: mocks.uploadVoiceObject,
  removeVoiceObject: mocks.removeVoiceObject,
}));

vi.mock('../_lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_lib')>()),
  resolveMessagePeer: mocks.resolveMessagePeer,
}));

const { ApiError } = await import('@/lib/server');
const { POST } = await import('../send-voice/route');

const WAV = encodePcm16Wav(new Float32Array(16_000 * 2.45), 16_000, 1);

function corruptWav(mutator: (view: DataView, bytes: Uint8Array) => void): Uint8Array {
  const bytes = WAV.slice();
  mutator(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), bytes);
  return bytes;
}

const NON_CANONICAL_WAVS: Array<[string, Uint8Array]> = [
  ['只有 RIFF/WAVE magic', new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x04, 0, 0, 0,
    0x57, 0x41, 0x56, 0x45, 1, 2, 3, 4,
  ])],
  ['RIFF 长度不匹配', corruptWav((view) => view.setUint32(4, 0, true))],
  ['缺少 fmt chunk', corruptWav((_view, bytes) => { bytes[12] = 0x78; })],
  ['fmt chunk 长度错误', corruptWav((view) => view.setUint32(16, 18, true))],
  ['不是 PCM format 1', corruptWav((view) => view.setUint16(20, 3, true))],
  ['不是单声道', corruptWav((view) => view.setUint16(22, 2, true))],
  ['不是 16000Hz', corruptWav((view) => view.setUint32(24, 8_000, true))],
  ['byte rate 不是 32000', corruptWav((view) => view.setUint32(28, 16_000, true))],
  ['block align 不是 2', corruptWav((view) => view.setUint16(32, 4, true))],
  ['不是 16-bit', corruptWav((view) => view.setUint16(34, 8, true))],
  ['缺少 data chunk', corruptWav((_view, bytes) => { bytes[36] = 0x78; })],
  ['data 长度不匹配', corruptWav((view) => view.setUint32(40, 2, true))],
  ['data 为空', encodePcm16Wav(new Float32Array(), 16_000, 1)],
];

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

const ROW = {
  id: 'voice-1',
  sender_id: 'user-1',
  receiver_id: 'user-2',
  type: 'voice',
  content: '今天记得吃药',
  audio_url: PATH,
  audio_duration: 2.45,
  is_ai_generated: false,
  is_read: false,
  read_at: null,
  created_at: '2026-07-13T00:00:00.000Z',
};

function createDatabase(
  result: { data: typeof ROW[] | null; error: unknown } = { data: [ROW], error: null },
) {
  const select = vi.fn().mockResolvedValue(result);
  const insert = vi.fn(() => ({ select }));
  return { client: { from: vi.fn(() => ({ insert })) }, insert, select };
}

function formRequest(overrides: {
  file?: File | null;
  receiverId?: string;
  content?: string;
  durationMs?: string;
} = {}): NextRequest {
  const form = new FormData();
  if (overrides.file !== null) {
    form.set('file', overrides.file ?? new File(
      [toArrayBuffer(WAV)],
      'recording.wav',
      { type: 'audio/wav' },
    ));
  }
  form.set('receiver_id', overrides.receiverId ?? 'user-2');
  form.set('content', overrides.content ?? '今天记得吃药');
  form.set('duration_ms', overrides.durationMs ?? '2450');
  return new Request('http://localhost/api/v1/messages/send-voice', {
    method: 'POST',
    body: form,
  }) as unknown as NextRequest;
}

describe('POST /api/v1/messages/send-voice multipart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.resolveMessagePeer.mockResolvedValue(undefined);
    mocks.buildVoiceObjectPath.mockReturnValue(PATH);
    mocks.uploadVoiceObject.mockResolvedValue(undefined);
    mocks.removeVoiceObject.mockResolvedValue(undefined);
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase().client);
  });

  it('未登录返回 401 且不上传', async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, 'Missing authentication token'));
    const response = await POST(formRequest());
    expect(response.status).toBe(401);
    expect(mocks.uploadVoiceObject).not.toHaveBeenCalled();
  });

  it('只接受 multipart 和必需字段', async () => {
    const json = new Request('http://localhost/api/v1/messages/send-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }) as unknown as NextRequest;
    expect((await POST(json)).status).toBe(400);
    expect((await POST(formRequest({ file: null }))).status).toBe(400);
    expect((await POST(formRequest({ receiverId: '' }))).status).toBe(400);
    expect((await POST(formRequest({ content: '   ' }))).status).toBe(400);
  });

  it('按 Unicode code point 校验 1000 字转写上限', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    const boundary = '😀'.repeat(1_000);

    expect((await POST(formRequest({ content: boundary }))).status).toBe(201);
    expect(database.insert).toHaveBeenCalledWith(expect.objectContaining({ content: boundary }));
    expect((await POST(formRequest({ content: `${boundary}😀` }))).status).toBe(400);
    expect(database.insert).toHaveBeenCalledOnce();
  });

  it('拒绝伪 WAV、WebM、超 5 MiB 和越界时长', async () => {
    expect((await POST(formRequest({
      file: new File([new Uint8Array([1, 2, 3])], 'fake.wav', { type: 'audio/wav' }),
    }))).status).toBe(400);
    expect((await POST(formRequest({
      file: new File([toArrayBuffer(WAV)], 'recording.webm', { type: 'audio/webm' }),
    }))).status).toBe(400);
    const large = new Uint8Array(5 * 1024 * 1024 + 1);
    large.set(WAV);
    expect((await POST(formRequest({
      file: new File([large], 'large.wav', { type: 'audio/wav' }),
    }))).status).toBe(413);
    for (const durationMs of ['0', '60001', 'NaN']) {
      expect((await POST(formRequest({ durationMs }))).status).toBe(400);
    }
  });

  it.each(NON_CANONICAL_WAVS)('拒绝非规范 WAV：%s', async (_label, bytes) => {
    const response = await POST(formRequest({
      file: new File([toArrayBuffer(bytes)], 'recording.wav', { type: 'audio/wav' }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.uploadVoiceObject).not.toHaveBeenCalled();
  });

  it('拒绝超过 60 秒但谎报 1ms 的 canonical PCM', async () => {
    const longWav = encodePcm16Wav(new Float32Array(16_000 * 61), 16_000, 1);
    const response = await POST(formRequest({
      durationMs: '1',
      file: new File([toArrayBuffer(longWav)], 'recording.wav', { type: 'audio/wav' }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.uploadVoiceObject).not.toHaveBeenCalled();
  });

  it('拒绝与 PCM 时长相差超过容差的客户端声明', async () => {
    const oneSecondWav = encodePcm16Wav(new Float32Array(16_000), 16_000, 1);
    const response = await POST(formRequest({
      durationMs: '5000',
      file: new File(
        [toArrayBuffer(oneSecondWav)],
        'recording.wav',
        { type: 'audio/wav' },
      ),
    }));

    expect(response.status).toBe(400);
    expect(mocks.uploadVoiceObject).not.toHaveBeenCalled();
  });

  it('容差内仍以 PCM 帧数推导的真实时长入库', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    const oneSecondWav = encodePcm16Wav(new Float32Array(16_000), 16_000, 1);

    const response = await POST(formRequest({
      durationMs: '1500',
      file: new File(
        [toArrayBuffer(oneSecondWav)],
        'recording.wav',
        { type: 'audio/wav' },
      ),
    }));

    expect(response.status).toBe(201);
    expect(database.insert).toHaveBeenCalledWith(expect.objectContaining({
      audio_duration: 1,
    }));
  });

  it('先上传稳定路径，再入库，并返回鉴权播放地址', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    const response = await POST(formRequest());

    expect(response.status).toBe(201);
    expect(mocks.resolveMessagePeer).toHaveBeenCalledWith(database.client, 'user-1', 'user-2');
    expect(mocks.buildVoiceObjectPath).toHaveBeenCalledWith('user-1', 'messages');
    expect(mocks.uploadVoiceObject).toHaveBeenCalledWith(
      database.client,
      PATH,
      expect.any(Uint8Array),
      'audio/wav',
    );
    expect(database.insert).toHaveBeenCalledWith(expect.objectContaining({
      sender_id: 'user-1',
      receiver_id: 'user-2',
      audio_url: PATH,
      audio_duration: 2.45,
    }));
    expect(mocks.uploadVoiceObject.mock.invocationCallOrder[0])
      .toBeLessThan(database.insert.mock.invocationCallOrder[0]);
    await expect(response.json()).resolves.toMatchObject({
      id: 'voice-1',
      audio_url: '/api/v1/voice/audio?message_id=voice-1',
    });
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('Storage 失败不入库', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    mocks.uploadVoiceObject.mockRejectedValue(new ApiError(503, '语音文件存储失败'));

    const response = await POST(formRequest());

    expect(response.status).toBe(503);
    expect(database.insert).not.toHaveBeenCalled();
  });

  it('数据库写入失败会补偿删除已上传对象', async () => {
    const database = createDatabase({ data: null, error: new Error('db failed') });
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await POST(formRequest());

    expect(response.status).toBe(500);
    expect(mocks.removeVoiceObject).toHaveBeenCalledWith(database.client, PATH);
  });

  it('补偿删除失败不会遮盖数据库主错误', async () => {
    const database = createDatabase({ data: null, error: new Error('db failed') });
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    mocks.removeVoiceObject.mockRejectedValue(new ApiError(503, 'cleanup failed'));

    const response = await POST(formRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ detail: '发送语音消息失败' });
  });
});
