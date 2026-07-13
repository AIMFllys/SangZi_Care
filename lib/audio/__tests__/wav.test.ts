import { describe, expect, it } from 'vitest';
import { encodePcm16Wav } from '../wav';

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return new TextDecoder().decode(bytes.slice(start, start + length));
}

describe('encodePcm16Wav', () => {
  it('写入标准 44 字节 RIFF/WAVE PCM16 单声道头', () => {
    const wav = encodePcm16Wav(new Float32Array([0, 0.5, -0.5]), 16_000, 1);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    expect(ascii(wav, 0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(42);
    expect(ascii(wav, 8, 4)).toBe('WAVE');
    expect(ascii(wav, 12, 4)).toBe('fmt ');
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint32(28, true)).toBe(32_000);
    expect(view.getUint16(32, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(wav, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(6);
    expect(wav.byteLength).toBe(50);
  });

  it('按声道计算 byteRate 和 blockAlign', () => {
    const wav = encodePcm16Wav(new Float32Array([0, 0, 1, -1]), 8_000, 2);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(28, true)).toBe(32_000);
    expect(view.getUint16(32, true)).toBe(4);
    expect(view.getUint32(40, true)).toBe(8);
  });

  it('将超范围和非有限采样钳制为有效 PCM16LE', () => {
    const wav = encodePcm16Wav(
      new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2, Number.NaN]),
      16_000,
      1,
    );
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    const samples = Array.from({ length: 8 }, (_, index) =>
      view.getInt16(44 + index * 2, true));

    expect(samples).toEqual([
      -32768,
      -32768,
      -16384,
      0,
      16384,
      32767,
      32767,
      0,
    ]);
  });

  it.each([
    [0, 1],
    [-1, 1],
    [16_000, 0],
    [16_000, 3],
  ])('拒绝无效 sampleRate=%s channels=%s', (sampleRate, channels) => {
    expect(() => encodePcm16Wav(new Float32Array(2), sampleRate, channels))
      .toThrow();
  });

  it('拒绝不能整除声道数的交错采样', () => {
    expect(() => encodePcm16Wav(new Float32Array(3), 16_000, 2)).toThrow();
  });
});
