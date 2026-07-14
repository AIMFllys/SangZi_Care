// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  chat: vi.fn(),
  synthesizeSpeech: vi.fn(),
}));

vi.mock('../doubao', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../doubao')>()),
  chat: mocks.chat,
}));

vi.mock('../mimo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../mimo')>()),
  synthesizeSpeech: mocks.synthesizeSpeech,
}));

const { generateAudio, generateBroadcastText } = await import('../broadcast');

describe('server/broadcast generateBroadcastText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('将最终正文按 Unicode 字符安全限制在 300 字且不截断代理对', async () => {
    const expected = `${'养'.repeat(299)}😀`;
    mocks.chat.mockResolvedValue(`标题：安全广播\n内容：${expected}尾`);

    const result = await generateBroadcastText({ category: '养生保健' });

    expect(result.content).toBe(expected);
    expect(Array.from(result.content)).toHaveLength(300);
  });
});

describe('server/broadcast generateAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('保留 MiMo 生成的真实 MP3 字节和 MIME，并附带估算时长', async () => {
    const bytes = new Uint8Array([0xff, 0xf3, 0x84, 0xc4]);
    mocks.synthesizeSpeech.mockResolvedValue({
      bytes,
      contentType: 'audio/mpeg',
    });

    const result = await generateAudio('健康广播');

    expect(mocks.synthesizeSpeech).toHaveBeenCalledWith('健康广播');
    expect(result).toEqual({
      bytes,
      contentType: 'audio/mpeg',
      duration: 1.1,
    });
  });
});
