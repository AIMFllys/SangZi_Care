// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  transcribeSpeech: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server')>();
  return {
    ...actual,
    requireUser: mocks.requireUser,
    transcribeSpeech: mocks.transcribeSpeech,
  };
});

const { ApiError, MimoError } = await import('@/lib/server');
const { POST } = await import('../transcribe/route');

const WAV = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x41, 0x56, 0x45,
]);
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);

function rawRequest(body: BodyInit, contentType?: string): NextRequest {
  return new Request('http://localhost/api/v1/voice/transcribe', {
    method: 'POST',
    headers: contentType ? { 'Content-Type': contentType } : undefined,
    body,
  }) as unknown as NextRequest;
}

function formRequest(file?: File): NextRequest {
  const form = new FormData();
  if (file) form.set('file', file);
  return rawRequest(form);
}

describe('POST /api/v1/voice/transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.transcribeSpeech.mockResolvedValue('今天记得按时吃药。');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('未登录返回 401', async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, 'Missing authentication token'));
    const response = await POST(formRequest(new File([WAV], 'recording.wav', { type: 'audio/wav' })));
    expect(response.status).toBe(401);
    expect(mocks.transcribeSpeech).not.toHaveBeenCalled();
  });

  it('要求 multipart/form-data', async () => {
    const response = await POST(rawRequest('plain', 'text/plain'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      detail: '请求体必须为 multipart/form-data',
    });
  });

  it('Content-Length 明示超过 6 MiB 时在读取 multipart 前返回 413', async () => {
    const oversized = formRequest(
      new File([WAV], 'recording.wav', { type: 'audio/wav' }),
    );
    oversized.headers.set('Content-Length', String(6 * 1024 * 1024 + 1));

    const response = await POST(oversized);

    expect(response.status).toBe(413);
    expect(oversized.bodyUsed).toBe(false);
    expect(mocks.transcribeSpeech).not.toHaveBeenCalled();
  });

  it('Content-Length 不可信时仍按实际 multipart 总字节数返回 413', async () => {
    const boundary = 'test-boundary';
    const multipart = new Blob([
      `--${boundary}\r\nContent-Disposition: form-data; name="padding"\r\n\r\n`,
      'x'.repeat(6 * 1024 * 1024),
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
      WAV,
      `\r\n--${boundary}--\r\n`,
    ]);
    const oversized = rawRequest(
      multipart,
      `multipart/form-data; boundary=${boundary}`,
    );
    oversized.headers.set('Content-Length', '1');

    const response = await POST(oversized);

    expect(response.status).toBe(413);
    expect(mocks.transcribeSpeech).not.toHaveBeenCalled();
  });

  it('保留 multipart boundary 大小写并接受合法音频', async () => {
    const boundary = 'AaB03x';
    const multipart = new Blob([
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
      WAV,
      `\r\n--${boundary}--\r\n`,
    ]);

    const response = await POST(rawRequest(
      multipart,
      `multipart/form-data; boundary=${boundary}`,
    ));

    expect(response.status).toBe(200);
    expect(mocks.transcribeSpeech).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'wav',
    );
  });

  it('缺失 file 字段返回 400', async () => {
    const response = await POST(formRequest());
    expect(response.status).toBe(400);
  });

  it('空文件返回 400', async () => {
    const response = await POST(formRequest(
      new File([], 'empty.wav', { type: 'audio/wav' }),
    ));
    expect(response.status).toBe(400);
  });

  it('超过应用侧 5 MiB 原始文件上限返回 413', async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
    bytes.set(WAV);
    const response = await POST(formRequest(
      new File([bytes], 'large.wav', { type: 'audio/wav' }),
    ));
    expect(response.status).toBe(413);
    expect(mocks.transcribeSpeech).not.toHaveBeenCalled();
  });

  it('拒绝 WebM、OGG 和 octet-stream', async () => {
    for (const type of ['audio/webm', 'audio/ogg', 'application/octet-stream']) {
      const response = await POST(formRequest(new File([WAV], 'audio.bin', { type })));
      expect(response.status).toBe(400);
    }
  });

  it('拒绝伪 WAV 头和 MIME/文件头不一致', async () => {
    const fake = await POST(formRequest(
      new File([new Uint8Array([1, 2, 3, 4])], 'fake.wav', { type: 'audio/wav' }),
    ));
    expect(fake.status).toBe(400);

    const mismatch = await POST(formRequest(
      new File([WAV], 'wrong.mp3', { type: 'audio/mpeg' }),
    ));
    expect(mismatch.status).toBe(400);
  });

  it.each([
    ['audio/wav', 'recording.wav', WAV, 'wav'],
    ['audio/x-wav', 'recording.wav', WAV, 'wav'],
    ['audio/mpeg', 'recording.mp3', MP3, 'mp3'],
    ['audio/mp3', 'recording.mp3', MP3, 'mp3'],
  ] as const)('接受 %s 且按文件头调用 %s', async (type, name, bytes, format) => {
    const response = await POST(formRequest(new File([bytes], name, { type })));

    expect(response.status).toBe(200);
    expect(mocks.transcribeSpeech).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      format,
    );
  });

  it('成功响应为私有不缓存 JSON 并带请求 ID', async () => {
    const response = await POST(formRequest(
      new File([WAV], 'recording.wav', { type: 'audio/wav' }),
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(response.json()).resolves.toEqual({ text: '今天记得按时吃药。' });
  });

  it('安全映射 MiMo 错误且日志不含音频', async () => {
    mocks.transcribeSpeech.mockRejectedValue(
      new MimoError('未识别到有效语音', 'no_speech', 422),
    );
    const response = await POST(formRequest(
      new File([WAV], 'recording.wav', { type: 'audio/wav' }),
    ));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ detail: '未识别到有效语音' });
    const serialized = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(serialized).toContain('audioBytes');
    expect(serialized).not.toContain(Buffer.from(WAV).toString('base64'));
  });
});
