import { encodePcm16Wav } from './wav';

const OUTPUT_SAMPLE_RATE = 16_000;
const MAX_RECORDING_DURATION_MS = 60_000;

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  sampleRate: number;
}

export interface VoiceRecorderSession {
  stop(): Promise<RecordingResult>;
  abort(): void;
}

interface StartPcmWavRecordingOptions {
  maxDurationMs: number;
  signal?: AbortSignal;
  onAutoStop?: () => void;
}

function createAbortError(): DOMException {
  return new DOMException('Recording aborted', 'AbortError');
}

function concatenate(chunks: readonly Float32Array[], length: number): Float32Array {
  const samples = new Float32Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }

  return samples;
}

function resampleMono(
  samples: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Float32Array {
  if (samples.length === 0 || inputSampleRate === outputSampleRate) {
    return samples;
  }

  const outputLength = Math.max(
    1,
    Math.round(samples.length * outputSampleRate / inputSampleRate),
  );
  const output = new Float32Array(outputLength);
  const inputFramesPerOutputFrame = inputSampleRate / outputSampleRate;

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * inputFramesPerOutputFrame;
    const leftIndex = Math.min(Math.floor(position), samples.length - 1);
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1);
    const fraction = position - leftIndex;
    output[index] = samples[leftIndex] * (1 - fraction) + samples[rightIndex] * fraction;
  }

  return output;
}

export async function startPcmWavRecording({
  maxDurationMs,
  signal,
  onAutoStop,
}: StartPcmWavRecordingOptions): Promise<VoiceRecorderSession> {
  if (!Number.isFinite(maxDurationMs) || maxDurationMs <= 0) {
    throw new RangeError('maxDurationMs must be a positive finite number');
  }

  if (signal?.aborted) {
    throw createAbortError();
  }

  const durationLimitMs = Math.min(maxDurationMs, MAX_RECORDING_DURATION_MS);
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let cleanedUp = false;
  let externallyAborted = false;
  let abortSession: (() => void) | null = null;

  const handleExternalAbort = (): void => {
    externallyAborted = true;
    abortSession?.();
  };

  signal?.addEventListener('abort', handleExternalAbort, { once: true });

  const cleanup = async (): Promise<void> => {
    if (cleanedUp) return;
    cleanedUp = true;

    signal?.removeEventListener('abort', handleExternalAbort);

    if (processor) {
      processor.onaudioprocess = null;
      try {
        processor.disconnect();
      } catch {
        // The node may already have been disconnected by the browser.
      }
    }

    if (source) {
      try {
        source.disconnect();
      } catch {
        // The node may already have been disconnected by the browser.
      }
    }

    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Continue releasing the remaining recording resources.
        }
      }
    }

    if (context) {
      try {
        await context.close();
      } catch {
        // Resource cleanup remains best-effort across browser implementations.
      }
    }
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1 },
      video: false,
    });

    if (externallyAborted || signal?.aborted) {
      throw createAbortError();
    }

    context = new AudioContext();
    if (!Number.isFinite(context.sampleRate) || context.sampleRate <= 0) {
      throw new RangeError('AudioContext returned an invalid sample rate');
    }
    if (context.state === 'suspended') {
      await context.resume();
      if (externallyAborted || signal?.aborted) throw createAbortError();
    }

    source = context.createMediaStreamSource(stream);
    processor = context.createScriptProcessor(4096, 2, 1);

    const inputSampleRate = context.sampleRate;
    const maxInputFrames = Math.ceil(inputSampleRate * durationLimitMs / 1_000);
    const maxOutputFrames = Math.floor(OUTPUT_SAMPLE_RATE * durationLimitMs / 1_000);
    const chunks: Float32Array[] = [];
    let inputLength = 0;
    let autoStopNotified = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let stopPromise: Promise<RecordingResult> | null = null;

    const finish = (aborted: boolean): Promise<RecordingResult> => {
      if (stopPromise) return stopPromise;

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (aborted) {
        stopPromise = cleanup().then(() => {
          throw createAbortError();
        });
        void stopPromise.catch(() => undefined);
        return stopPromise;
      }

      const inputSamples = concatenate(chunks, inputLength);
      const resampledSamples = resampleMono(
        inputSamples,
        inputSampleRate,
        OUTPUT_SAMPLE_RATE,
      );
      const outputSamples = resampledSamples.length > maxOutputFrames
        ? resampledSamples.slice(0, maxOutputFrames)
        : resampledSamples;
      const durationMs = outputSamples.length * 1_000 / OUTPUT_SAMPLE_RATE;
      const wav = encodePcm16Wav(outputSamples, OUTPUT_SAMPLE_RATE, 1);

      stopPromise = cleanup().then(() => {
        const wavBuffer = wav.buffer.slice(
          wav.byteOffset,
          wav.byteOffset + wav.byteLength,
        ) as ArrayBuffer;
        return {
          blob: new Blob([wavBuffer], { type: 'audio/wav' }),
          durationMs,
          sampleRate: OUTPUT_SAMPLE_RATE,
        };
      });
      return stopPromise;
    };

    processor.onaudioprocess = (event: AudioProcessingEvent): void => {
      const { inputBuffer } = event;
      if (inputBuffer.numberOfChannels <= 0 || inputBuffer.length <= 0) return;
      const remainingFrames = maxInputFrames - inputLength;
      if (remainingFrames <= 0) return;
      const frameCount = Math.min(inputBuffer.length, remainingFrames);

      const mono = new Float32Array(frameCount);
      for (let channel = 0; channel < inputBuffer.numberOfChannels; channel += 1) {
        const channelSamples = inputBuffer.getChannelData(channel);
        for (let frame = 0; frame < frameCount; frame += 1) {
          mono[frame] += channelSamples[frame] / inputBuffer.numberOfChannels;
        }
      }

      chunks.push(mono);
      inputLength += mono.length;

      if (inputLength >= maxInputFrames && !autoStopNotified) {
        autoStopNotified = true;
        void finish(false).catch(() => undefined);
        try {
          onAutoStop?.();
        } catch {
          // Resource cleanup must not depend on consumer callback behavior.
        }
      }
    };

    source.connect(processor);
    processor.connect(context.destination);

    const stop = (): Promise<RecordingResult> => finish(false);
    const abort = (): void => {
      void finish(true);
    };

    abortSession = abort;
    timeoutId = setTimeout(() => {
      void stop().catch(() => undefined);
    }, durationLimitMs);

    return { stop, abort };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
