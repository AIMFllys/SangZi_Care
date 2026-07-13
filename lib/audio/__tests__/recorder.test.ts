import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPcmWavRecording } from '../recorder';

interface FakeProcessor {
  onaudioprocess: ((event: AudioProcessingEvent) => void) | null;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

const state = {
  processor: null as FakeProcessor | null,
  sourceDisconnect: vi.fn(),
  processorDisconnect: vi.fn(),
  trackStop: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  getUserMedia: vi.fn(),
  contextSampleRate: 48_000,
  contextState: 'running' as AudioContextState,
  throwOnSource: false,
  throwOnSourceConnect: false,
};

function makeStream(): MediaStream {
  return {
    getTracks: () => [{ stop: state.trackStop }],
  } as unknown as MediaStream;
}

class FakeAudioContext {
  sampleRate = state.contextSampleRate;
  destination = {} as AudioDestinationNode;
  state = state.contextState;

  createMediaStreamSource() {
    if (state.throwOnSource) throw new Error('source failed');
    return {
      connect: vi.fn(() => {
        if (state.throwOnSourceConnect) throw new Error('source connect failed');
      }),
      disconnect: state.sourceDisconnect,
    } as unknown as MediaStreamAudioSourceNode;
  }

  createScriptProcessor() {
    const processor: FakeProcessor = {
      onaudioprocess: null,
      connect: vi.fn(),
      disconnect: state.processorDisconnect,
    };
    state.processor = processor;
    return processor as unknown as ScriptProcessorNode;
  }

  close = state.close;
  resume = state.resume;
}

function emitAudio(channels: ArrayLike<number>[]): void {
  const processor = state.processor;
  if (!processor?.onaudioprocess) throw new Error('recorder processor is not ready');
  const frames = channels[0]?.length ?? 0;
  processor.onaudioprocess({
    inputBuffer: {
      length: frames,
      numberOfChannels: channels.length,
      getChannelData: (channel: number) => new Float32Array(channels[channel]),
    },
  } as unknown as AudioProcessingEvent);
}

describe('startPcmWavRecording', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T00:00:00Z'));
    state.processor = null;
    state.sourceDisconnect = vi.fn();
    state.processorDisconnect = vi.fn();
    state.trackStop = vi.fn();
    state.close = vi.fn().mockResolvedValue(undefined);
    state.resume = vi.fn().mockResolvedValue(undefined);
    state.getUserMedia = vi.fn().mockResolvedValue(makeStream());
    state.contextSampleRate = 48_000;
    state.contextState = 'running';
    state.throwOnSource = false;
    state.throwOnSourceConnect = false;

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: state.getUserMedia },
    });
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('申请单声道麦克风并输出 16kHz PCM WAV Blob', async () => {
    const session = await startPcmWavRecording({ maxDurationMs: 60_000 });
    emitAudio([
      new Array(4_800).fill(0.5),
      new Array(4_800).fill(-0.5),
    ]);
    vi.advanceTimersByTime(1_000);

    const result = await session.stop();
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const view = new DataView(bytes.buffer);

    expect(state.getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({ channelCount: 1 }),
      video: false,
    });
    expect(result.blob.type).toBe('audio/wav');
    expect(result.sampleRate).toBe(16_000);
    expect(result.durationMs).toBe(100);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(22, true)).toBe(1);
  });

  it('混合多声道并将 48kHz 重采样为 16kHz', async () => {
    const session = await startPcmWavRecording({ maxDurationMs: 60_000 });
    emitAudio([
      [1, 1, 1, 1, 1, 1],
      [-1, -1, -1, -1, -1, -1],
    ]);

    const result = await session.stop();
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const view = new DataView(bytes.buffer);

    expect(view.getUint32(40, true)).toBe(4);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0);
  });

  it('AudioContext 初始 suspended 时先恢复再开始采集', async () => {
    state.contextState = 'suspended';

    const session = await startPcmWavRecording({ maxDurationMs: 60_000 });

    expect(state.resume).toHaveBeenCalledOnce();
    session.abort();
    await expect(session.stop()).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('并发 stop 复用同一个 Promise 且资源只清理一次', async () => {
    const session = await startPcmWavRecording({ maxDurationMs: 60_000 });
    const first = session.stop();
    const second = session.stop();

    expect(second).toBe(first);
    await first;
    expect(state.trackStop).toHaveBeenCalledOnce();
    expect(state.sourceDisconnect).toHaveBeenCalledOnce();
    expect(state.processorDisconnect).toHaveBeenCalledOnce();
    expect(state.close).toHaveBeenCalledOnce();
  });

  it('达到硬时长后自动停止，之后 stop 返回缓存结果', async () => {
    state.contextSampleRate = 16_000;
    const session = await startPcmWavRecording({ maxDurationMs: 1_500 });
    emitAudio([new Float32Array(16_000 * 1.5)]);

    await vi.advanceTimersByTimeAsync(1_500);
    const result = await session.stop();

    expect(result.durationMs).toBe(1_500);
    expect(state.trackStop).toHaveBeenCalledOnce();
    expect(state.close).toHaveBeenCalledOnce();
  });

  it('调用方请求超过 60 秒时仍按应用硬上限自动停止', async () => {
    state.contextSampleRate = 16_000;
    const session = await startPcmWavRecording({ maxDurationMs: 120_000 });
    emitAudio([new Float32Array(16_000)]);

    await vi.advanceTimersByTimeAsync(60_000);
    const result = await session.stop();

    expect(result.durationMs).toBe(1_000);
    expect(state.trackStop).toHaveBeenCalledOnce();
    expect(state.close).toHaveBeenCalledOnce();
  });

  it('无论墙钟与回调节奏如何都按 PCM 帧硬截断 60 秒', async () => {
    state.contextSampleRate = 16_000;
    const session = await startPcmWavRecording({ maxDurationMs: 120_000 });
    emitAudio([new Float32Array(16_000 * 61)]);

    const result = await session.stop();
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const view = new DataView(bytes.buffer);

    expect(result.durationMs).toBe(60_000);
    expect(view.getUint32(40, true)).toBe(16_000 * 60 * 2);
  });

  it('abort 立即释放资源，后续 stop 返回 AbortError', async () => {
    const session = await startPcmWavRecording({ maxDurationMs: 60_000 });
    session.abort();

    await expect(session.stop()).rejects.toMatchObject({ name: 'AbortError' });
    expect(state.trackStop).toHaveBeenCalledOnce();
    expect(state.close).toHaveBeenCalledOnce();
  });

  it('外部 AbortSignal 中止录音并移除监听', async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const session = await startPcmWavRecording({
      maxDurationMs: 60_000,
      signal: controller.signal,
    });

    controller.abort();

    await expect(session.stop()).rejects.toMatchObject({ name: 'AbortError' });
    expect(remove).toHaveBeenCalled();
  });

  it('开始前已中止时不申请麦克风', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(startPcmWavRecording({
      maxDurationMs: 60_000,
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(state.getUserMedia).not.toHaveBeenCalled();
  });

  it('初始化节点失败时仍停止轨道并关闭 AudioContext', async () => {
    state.throwOnSource = true;

    await expect(startPcmWavRecording({ maxDurationMs: 60_000 }))
      .rejects.toThrow('source failed');
    expect(state.trackStop).toHaveBeenCalledOnce();
    expect(state.close).toHaveBeenCalledOnce();
  });

  it('节点创建后连接失败时仍断开节点并释放底层资源', async () => {
    state.throwOnSourceConnect = true;

    await expect(startPcmWavRecording({ maxDurationMs: 60_000 }))
      .rejects.toThrow('source connect failed');
    expect(state.sourceDisconnect).toHaveBeenCalledOnce();
    expect(state.processorDisconnect).toHaveBeenCalledOnce();
    expect(state.trackStop).toHaveBeenCalledOnce();
    expect(state.close).toHaveBeenCalledOnce();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    '拒绝无效 maxDurationMs=%s',
    async (maxDurationMs) => {
      await expect(startPcmWavRecording({ maxDurationMs })).rejects.toThrow();
      expect(state.getUserMedia).not.toHaveBeenCalled();
    },
  );
});
