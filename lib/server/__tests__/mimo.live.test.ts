import { describe, expect, it } from 'vitest';
import { synthesizeSpeech, transcribeSpeech } from '../mimo';

const LIVE_TEST_ENABLED = process.env.RUN_MIMO_LIVE === '1';
const ROUND_TRIP_TEXT = '今天记得按时吃药';

function normalizeChinese(text: string): string {
  return text.replace(/[^\p{Script=Han}]/gu, '');
}

describe.skipIf(!LIVE_TEST_ENABLED)('MiMo 真实 TTS → ASR 往返', () => {
  it('合成可解析的 MP3，并识别出原句核心语义', async () => {
    if (!process.env.MIMO_API_KEY?.trim()) {
      throw new Error('MiMo 实时测试缺少 MIMO_API_KEY');
    }

    const speech = await synthesizeSpeech(ROUND_TRIP_TEXT);
    expect(speech.contentType).toBe('audio/mpeg');
    expect(speech.bytes.byteLength).toBeGreaterThan(1_000);

    const transcript = normalizeChinese(
      await transcribeSpeech(speech.bytes, 'mp3'),
    );
    expect(transcript).toContain('今天');
    expect(transcript).toContain('按时');
    expect(transcript).toContain('吃药');
  }, 50_000);
});
