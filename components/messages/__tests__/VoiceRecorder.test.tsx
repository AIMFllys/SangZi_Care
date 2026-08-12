import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodePcm16Wav } from '@/lib/audio/wav';

const mocks = vi.hoisted(() => ({
  startListening: vi.fn(),
  stopListening: vi.fn(),
  cancelListening: vi.fn(),
  resetTranscript: vi.fn(),
  phase: 'idle',
  error: null as string | null,
}));

vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    isListening: mocks.phase === 'recording',
    transcript: '',
    phase: mocks.phase,
    error: mocks.error,
    currentLevel: 'mimo' as const,
    startListening: mocks.startListening,
    stopListening: mocks.stopListening,
    cancelListening: mocks.cancelListening,
    resetTranscript: mocks.resetTranscript,
  }),
}));

import VoiceRecorder, { type TranscriptDraftPlacement } from '../VoiceRecorder';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function makeWavBlob(durationMs: number): Blob {
  const bytes = encodePcm16Wav(
    new Float32Array(Math.round(16_000 * durationMs / 1_000)),
    16_000,
    1,
  );
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: 'audio/wav' });
}

const WAV = makeWavBlob(2_450);
const RESULT = {
  transcript: '今天记得吃药',
  audioBlob: WAV,
  durationMs: 2_450,
};

async function recordAndStop(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
  await waitFor(() => expect(mocks.startListening).toHaveBeenCalledOnce());
  await waitFor(() => {
    expect(screen.getByRole('button', { name: '停止录音' })).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '停止录音' }));
  });
}

describe('VoiceRecorder 真实 WAV 草稿', () => {
  const onSend = vi.fn();
  const onCancel = vi.fn();
  const onTranscriptReady = vi.fn<() => TranscriptDraftPlacement>(() => 'seeded');
  const onEditAsText = vi.fn();
  const onTranscriptDiscard = vi.fn();

  const recorder = () => (
    <VoiceRecorder
      onSend={onSend}
      onCancel={onCancel}
      onTranscriptReady={onTranscriptReady}
      onEditAsText={onEditAsText}
      onTranscriptDiscard={onTranscriptDiscard}
    />
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.phase = 'idle';
    mocks.error = null;
    mocks.startListening.mockResolvedValue(undefined);
    mocks.stopListening.mockResolvedValue(RESULT);
    onSend.mockResolvedValue(undefined);
  });

  it('空闲时只渲染紧凑的开始录音按钮', () => {
    render(recorder());
    expect(screen.getByRole('button', { name: '开始录音' })).toBeInTheDocument();
    expect(screen.queryByText('发送')).not.toBeInTheDocument();
  });

  it('申请麦克风权限时不能抢先停止，并可取消迟到的启动', async () => {
    const start = deferred<void>();
    mocks.startListening.mockReturnValue(start.promise);
    render(recorder());

    fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
    expect(screen.getByText('正在申请麦克风权限...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '停止录音' })).not.toBeInTheDocument();
    const cancel = screen.getByRole('button', { name: '取消录音' });
    expect(cancel).toBeEnabled();
    fireEvent.click(cancel);

    expect(mocks.stopListening).not.toHaveBeenCalled();
    expect(mocks.cancelListening).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();

    await act(async () => {
      start.resolve();
      await start.promise;
    });

    expect(screen.getByRole('button', { name: '开始录音' })).toBeEnabled();
    expect(screen.queryByText('正在录音，最长 60 秒')).not.toBeInTheDocument();
  });

  it('停止会等待 StopResult 并展示最终转写与真实时长', async () => {
    const stopResult = deferred<typeof RESULT | null>();
    mocks.stopListening.mockReturnValue(stopResult.promise);
    render(recorder());
    fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
    await waitFor(() => {
      expect(mocks.startListening).toHaveBeenCalledOnce();
      expect(screen.getByRole('button', { name: '停止录音' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: '停止录音' }));
    expect(screen.getByText('正在识别，请稍候...')).toBeInTheDocument();
    expect(screen.queryByText('发送')).not.toBeInTheDocument();

    await act(async () => {
      stopResult.resolve(RESULT);
      await Promise.resolve();
    });

    expect(screen.getByText('今天记得吃药')).toBeInTheDocument();
    expect(screen.getByText('2.5秒')).toBeInTheDocument();
    expect(onTranscriptReady).toHaveBeenCalledWith('今天记得吃药');
    expect(screen.getByRole('status')).toHaveTextContent('转写已加入文字草稿');
    expect(screen.getByRole('button', { name: '编辑转写文字' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '发送语音消息' })).toBeEnabled();
  });

  it('已有手输草稿时显示追加选择，点击只交接文字而不发语音', async () => {
    onTranscriptReady.mockReturnValueOnce('manual-preserved');
    render(recorder());
    await recordAndStop();

    expect(screen.getByRole('status')).toHaveTextContent('转写未覆盖');
    fireEvent.click(screen.getByRole('button', {
      name: '将转写追加到已有文字并编辑',
    }));

    expect(onEditAsText).toHaveBeenCalledWith('今天记得吃药', 'manual-preserved');
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByText('今天记得吃药')).not.toBeInTheDocument();
  });

  it('重录会先废弃旧转写，不让父级草稿残留', async () => {
    render(recorder());
    await recordAndStop();

    fireEvent.click(screen.getByRole('button', { name: '重新录音' }));

    expect(onTranscriptDiscard).toHaveBeenCalledWith('今天记得吃药');
    await waitFor(() => expect(mocks.startListening).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('今天记得吃药')).not.toBeInTheDocument();
  });

  it('识别等待期间可取消，并忽略真正迟到的转写结果', async () => {
    const stopResult = deferred<typeof RESULT | null>();
    mocks.stopListening.mockReturnValue(stopResult.promise);
    render(recorder());
    fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
    await waitFor(() => {
      expect(mocks.startListening).toHaveBeenCalledOnce();
      expect(screen.getByRole('button', { name: '停止录音' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: '停止录音' }));
    const cancel = screen.getByRole('button', { name: '取消录音' });
    expect(cancel).toBeEnabled();
    fireEvent.click(cancel);

    expect(mocks.cancelListening).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();

    await act(async () => {
      stopResult.resolve(RESULT);
      await stopResult.promise;
    });

    expect(screen.queryByText('今天记得吃药')).not.toBeInTheDocument();
    expect(onTranscriptReady).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '开始录音' })).toBeInTheDocument();
  });

  it('发送完整 WAV 草稿，等待成功后才清空', async () => {
    const upload = deferred<void>();
    onSend.mockReturnValue(upload.promise);
    render(recorder());
    await recordAndStop();

    fireEvent.click(screen.getByRole('button', { name: '发送语音消息' }));
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({
      content: '今天记得吃药',
      audioBlob: WAV,
      durationMs: 2_450,
      signal: expect.any(AbortSignal),
    }));
    expect(screen.getByRole('button', { name: '正在发送语音' })).toBeDisabled();

    await act(async () => upload.resolve());
    await waitFor(() => {
      expect(screen.queryByText('今天记得吃药')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '开始录音' })).toBeInTheDocument();
    });
  });

  it('上传等待期间可取消、中止请求，并忽略迟到的发送完成', async () => {
    const upload = deferred<void>();
    onSend.mockReturnValue(upload.promise);
    render(recorder());
    await recordAndStop();

    fireEvent.click(screen.getByRole('button', { name: '发送语音消息' }));
    const signal = onSend.mock.calls[0][0].signal as AbortSignal;
    const cancel = screen.getByRole('button', { name: '取消录音' });
    expect(cancel).toBeEnabled();
    fireEvent.click(cancel);

    expect(signal.aborted).toBe(true);
    expect(mocks.cancelListening).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();

    await act(async () => {
      upload.resolve();
      await upload.promise;
    });

    expect(screen.queryByText('今天记得吃药')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始录音' })).toBeInTheDocument();
  });

  it('快速双击发送也只启动一次上传', async () => {
    const upload = deferred<void>();
    onSend.mockReturnValue(upload.promise);
    render(recorder());
    await recordAndStop();

    const send = screen.getByRole('button', { name: '发送语音消息' });
    act(() => {
      send.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      send.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSend).toHaveBeenCalledOnce();
    await act(async () => upload.resolve());
  });

  it('发送失败保留草稿并显示错误，不能伪装成功', async () => {
    onSend.mockRejectedValue(new Error('语音上传失败'));
    render(recorder());
    await recordAndStop();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '发送语音消息' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('语音上传失败');
    expect(screen.getByText('今天记得吃药')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送语音消息' })).toBeEnabled();
  });

  it('取消使用 cancelListening，迟到转写不会重新出现', async () => {
    render(recorder());
    await recordAndStop();

    fireEvent.click(screen.getByRole('button', { name: '取消录音' }));

    expect(mocks.cancelListening).toHaveBeenCalledOnce();
    expect(mocks.stopListening).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onTranscriptDiscard).toHaveBeenCalledWith('今天记得吃药');
    expect(screen.queryByText('今天记得吃药')).not.toBeInTheDocument();
  });

  it('ASR 60 秒自动成功时读取缓存结果', async () => {
    const view = render(recorder());
    fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
    await waitFor(() => expect(mocks.startListening).toHaveBeenCalledOnce());

    mocks.phase = 'success';
    view.rerender(recorder());

    await waitFor(() => {
      expect(mocks.stopListening).toHaveBeenCalledOnce();
      expect(screen.getByText('今天记得吃药')).toBeInTheDocument();
    });
  });

  it('卸载会取消录音并中止仍在发送的上传', async () => {
    const upload = deferred<void>();
    onSend.mockReturnValue(upload.promise);
    const view = render(recorder());
    await recordAndStop();
    fireEvent.click(screen.getByRole('button', { name: '发送语音消息' }));
    const signal = onSend.mock.calls[0][0].signal as AbortSignal;

    view.unmount();

    expect(signal.aborted).toBe(true);
    expect(mocks.cancelListening).toHaveBeenCalled();
  });
});
