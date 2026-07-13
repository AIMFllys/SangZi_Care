// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  synthesizeSpeech: vi.fn(),
}));

vi.mock('../mimo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../mimo')>()),
  synthesizeSpeech: mocks.synthesizeSpeech,
}));

const { generateAudio } = await import('../broadcast');

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
