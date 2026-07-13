const WAV_HEADER_BYTES = 44;
const PCM_BYTES_PER_SAMPLE = 2;
const CANONICAL_SAMPLE_RATE = 16_000;

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function hasAscii(bytes: Uint8Array, offset: number, value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

/** Return duration for the exact PCM16LE mono 16kHz WAV layout produced here. */
export function getCanonicalPcm16MonoWavDurationMs(bytes: Uint8Array): number | null {
  if (bytes.byteLength <= WAV_HEADER_BYTES) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataByteLength = view.getUint32(40, true);

  const isCanonical = hasAscii(bytes, 0, 'RIFF')
    && view.getUint32(4, true) === bytes.byteLength - 8
    && hasAscii(bytes, 8, 'WAVE')
    && hasAscii(bytes, 12, 'fmt ')
    && view.getUint32(16, true) === 16
    && view.getUint16(20, true) === 1
    && view.getUint16(22, true) === 1
    && view.getUint32(24, true) === CANONICAL_SAMPLE_RATE
    && view.getUint32(28, true) === CANONICAL_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE
    && view.getUint16(32, true) === PCM_BYTES_PER_SAMPLE
    && view.getUint16(34, true) === 16
    && hasAscii(bytes, 36, 'data')
    && dataByteLength > 0
    && dataByteLength % PCM_BYTES_PER_SAMPLE === 0
    && dataByteLength === bytes.byteLength - WAV_HEADER_BYTES;

  if (!isCanonical) return null;
  return dataByteLength * 1_000 / (CANONICAL_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE);
}

/**
 * Encode interleaved floating-point audio samples as a PCM16 little-endian WAV.
 */
export function encodePcm16Wav(
  samples: Float32Array,
  sampleRate: number,
  channels: number,
): Uint8Array {
  if (!Number.isInteger(channels) || channels < 1 || channels > 2) {
    throw new RangeError('channels must be either 1 or 2');
  }

  const blockAlign = channels * PCM_BYTES_PER_SAMPLE;
  if (
    !Number.isInteger(sampleRate)
    || sampleRate <= 0
    || sampleRate > Math.floor(0xffff_ffff / blockAlign)
  ) {
    throw new RangeError('sampleRate must be a positive integer supported by WAV');
  }

  if (samples.length % channels !== 0) {
    throw new RangeError('interleaved sample count must be divisible by channels');
  }

  const dataByteLength = samples.length * PCM_BYTES_PER_SAMPLE;
  if (dataByteLength > 0xffff_ffff - 36) {
    throw new RangeError('audio data is too large for a WAV file');
  }

  const bytes = new Uint8Array(WAV_HEADER_BYTES + dataByteLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  for (let index = 0; index < samples.length; index += 1) {
    const input = samples[index];
    const clamped = Number.isFinite(input)
      ? Math.max(-1, Math.min(1, input))
      : 0;
    const pcm16 = Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
    view.setInt16(WAV_HEADER_BYTES + index * PCM_BYTES_PER_SAMPLE, pcm16, true);
  }

  return bytes;
}
