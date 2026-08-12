import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VoicePage from '../page';

const mocks = vi.hoisted(() => ({
  router: { back: vi.fn(), push: vi.fn() },
  recognition: {
    isListening: false,
    phase: 'idle',
    transcript: '',
    error: null as string | null,
    currentLevel: 'mimo',
    startListening: vi.fn(),
    stopListening: vi.fn(),
    cancelListening: vi.fn(),
    resetTranscript: vi.fn(),
  },
  ai: {
    messages: [] as Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
      actions?: Array<{
        type: string;
        label: string;
        status: 'success' | 'warning' | 'error';
        success: boolean;
      }>;
    }>,
    isLoading: false,
    error: null as string | null,
    sessionId: null,
    sendMessage: vi.fn(),
    cancelPending: vi.fn(),
    recognizeIntent: vi.fn(),
    getSummary: vi.fn(),
    clearMessages: vi.fn(),
  },
  tts: {
    isSpeaking: false,
    error: null as string | null,
    currentLevel: 'mimo',
    speak: vi.fn(),
    stop: vi.fn(),
    setSpeed: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => mocks.recognition,
}));
vi.mock('@/hooks/useAIChat', () => ({ useAIChat: () => mocks.ai }));
vi.mock('@/hooks/useTextToSpeech', () => ({ useTextToSpeech: () => mocks.tts }));

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

async function beginRecording(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: '开始说话' }));
  await waitFor(() => expect(mocks.recognition.startListening).toHaveBeenCalledOnce());
  expect(screen.getByText('正在听您说话，再点一次结束')).toBeInTheDocument();
}

describe('/voice real conversation state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recognition.phase = 'idle';
    mocks.recognition.transcript = '';
    mocks.recognition.error = null;
    mocks.recognition.startListening.mockResolvedValue(undefined);
    mocks.recognition.stopListening.mockResolvedValue({
      transcript: '今天身体怎么样',
      audioBlob: new Blob(['wav'], { type: 'audio/wav' }),
      durationMs: 1_000,
    });
    mocks.ai.messages = [];
    mocks.ai.error = null;
    mocks.ai.sendMessage.mockResolvedValue({
      reply: '今天状态很好，记得多喝水',
      actions: [],
    });
    mocks.tts.error = null;
    mocks.tts.speak.mockResolvedValue(undefined);
  });

  it('开始录音且页面中不再存在 2 秒假转写', async () => {
    render(<VoicePage />);

    await beginRecording();

    expect(mocks.recognition.resetTranscript).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: '停止听取' })).toBeInTheDocument();
    expect(screen.queryByText(/我想听京剧/)).not.toBeInTheDocument();
  });

  it('严格执行 ASR → AI → TTS，并展示每个阶段', async () => {
    const transcription = deferred<{
      transcript: string;
      audioBlob: Blob;
      durationMs: number;
    } | null>();
    const answer = deferred<{
      reply: string;
      actions: Array<{
        type: string;
        label: string;
        status: 'success' | 'warning' | 'error';
        success: boolean;
      }>;
    }>();
    const speech = deferred<void>();
    mocks.recognition.stopListening.mockReturnValue(transcription.promise);
    mocks.ai.sendMessage.mockReturnValue(answer.promise);
    mocks.tts.speak.mockReturnValue(speech.promise);
    render(<VoicePage />);
    await beginRecording();

    fireEvent.click(screen.getByRole('button', { name: '停止听取' }));
    expect(screen.getByText('正在识别您刚才说的话...')).toBeInTheDocument();

    await act(async () => {
      transcription.resolve({
        transcript: '我想听京剧',
        audioBlob: new Blob(['wav'], { type: 'audio/wav' }),
        durationMs: 1_500,
      });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mocks.ai.sendMessage).toHaveBeenCalledWith('我想听京剧');
      expect(screen.getByText('AI 正在思考...')).toBeInTheDocument();
    });

    await act(async () => {
      answer.resolve({ reply: '好的，为您找一段经典京剧。', actions: [] });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mocks.tts.speak).toHaveBeenCalledWith('好的，为您找一段经典京剧。');
      expect(screen.getByText('正在为您播报...')).toBeInTheDocument();
    });

    await act(async () => {
      speech.resolve();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText('点击麦克风开始下一轮对话')).toBeInTheDocument();
      expect(screen.getByText('好的，为您找一段经典京剧。')).toBeInTheDocument();
    });
    expect(mocks.ai.sendMessage).toHaveBeenCalledOnce();
    expect(mocks.tts.speak).toHaveBeenCalledOnce();
  });

  it('展示成功、未发送和技术失败动作，但只朗读 AI 回复', async () => {
    mocks.ai.sendMessage.mockResolvedValueOnce({
      reply: '碎碎念已保存，我把实际处理结果列在下方。',
      actions: [
        {
          type: 'murmur_saved', label: '碎碎念已保存', status: 'success', success: true,
        },
        {
          type: 'no_family_recipients',
          label: '暂无已绑定家属，本次未发送',
          status: 'warning',
          success: false,
        },
        {
          type: 'tool_error', label: '同步家人失败', status: 'error', success: false,
        },
      ],
    });
    render(<VoicePage />);
    await beginRecording();

    fireEvent.click(screen.getByRole('button', { name: '停止听取' }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: '本轮处理结果' }))
        .toHaveTextContent('已完成碎碎念已保存');
      expect(screen.getByRole('status', { name: '本轮处理结果' }))
        .toHaveTextContent('请留意暂无已绑定家属，本次未发送');
      expect(screen.getByRole('status', { name: '本轮处理结果' }))
        .toHaveTextContent('未完成同步家人失败');
    });
    expect(mocks.tts.speak).toHaveBeenCalledWith('碎碎念已保存，我把实际处理结果列在下方。');
    expect(mocks.tts.speak).not.toHaveBeenCalledWith(expect.stringContaining('暂无已绑定家属'));
  });

  it('开始下一轮时清理上一轮动作反馈', async () => {
    mocks.ai.sendMessage.mockResolvedValueOnce({
      reply: '已处理',
      actions: [{
        type: 'murmur_saved', label: '上一轮碎碎念已保存', status: 'success', success: true,
      }],
    });
    render(<VoicePage />);
    await beginRecording();
    fireEvent.click(screen.getByRole('button', { name: '停止听取' }));
    await waitFor(() => expect(screen.getByText('上一轮碎碎念已保存')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '开始说话' }));

    await waitFor(() => expect(screen.queryByText('上一轮碎碎念已保存')).not.toBeInTheDocument());
  });

  it('结束对话后迟到的 AI 回复与动作都不会显示或朗读', async () => {
    const answer = deferred<{
      reply: string;
      actions: Array<{
        type: string;
        label: string;
        status: 'success' | 'warning' | 'error';
        success: boolean;
      }>;
    }>();
    mocks.ai.sendMessage.mockReturnValueOnce(answer.promise);
    render(<VoicePage />);
    await beginRecording();
    fireEvent.click(screen.getByRole('button', { name: '停止听取' }));
    await waitFor(() => expect(mocks.ai.sendMessage).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: '结束对话' }));
    await act(async () => {
      answer.resolve({
        reply: '迟到回复',
        actions: [{
          type: 'murmur_shared', label: '迟到同步动作', status: 'success', success: true,
        }],
      });
      await Promise.resolve();
    });

    expect(screen.queryByText('迟到回复')).not.toBeInTheDocument();
    expect(screen.queryByText('迟到同步动作')).not.toBeInTheDocument();
    expect(mocks.tts.speak).not.toHaveBeenCalled();
  });

  it('结束对话会取消所有层，迟到的 ASR 不再发送给 AI', async () => {
    const transcription = deferred<{
      transcript: string;
      audioBlob: Blob;
      durationMs: number;
    } | null>();
    mocks.recognition.stopListening.mockReturnValue(transcription.promise);
    render(<VoicePage />);
    await beginRecording();
    fireEvent.click(screen.getByRole('button', { name: '停止听取' }));

    fireEvent.click(screen.getByRole('button', { name: '结束对话' }));

    expect(mocks.recognition.cancelListening).toHaveBeenCalledOnce();
    expect(mocks.ai.cancelPending).toHaveBeenCalledOnce();
    expect(mocks.tts.stop).toHaveBeenCalledOnce();
    expect(mocks.router.back).toHaveBeenCalledOnce();

    await act(async () => {
      transcription.resolve({
        transcript: '迟到文本',
        audioBlob: new Blob(['wav']),
        durationMs: 900,
      });
      await Promise.resolve();
    });
    expect(mocks.ai.sendMessage).not.toHaveBeenCalled();
    expect(mocks.tts.speak).not.toHaveBeenCalled();
  });

  it('ASR 到达 60 秒自动成功时，页面自动接续 AI 与 TTS', async () => {
    const view = render(<VoicePage />);
    await beginRecording();

    mocks.recognition.phase = 'success';
    mocks.recognition.transcript = '自动结束的文本';
    mocks.recognition.stopListening.mockResolvedValue({
      transcript: '自动结束的文本',
      audioBlob: new Blob(['wav'], { type: 'audio/wav' }),
      durationMs: 60_000,
    });
    view.rerender(<VoicePage />);

    await waitFor(() => {
      expect(mocks.ai.sendMessage).toHaveBeenCalledWith('自动结束的文本');
      expect(mocks.tts.speak).toHaveBeenCalledWith('今天状态很好，记得多喝水');
    });
  });

  it.each([
    ['录音', () => mocks.recognition.startListening.mockRejectedValueOnce(new Error('麦克风失败'))],
    ['转写', () => mocks.recognition.stopListening.mockRejectedValueOnce(new Error('识别失败'))],
    ['思考', () => mocks.ai.sendMessage.mockRejectedValueOnce(new Error('AI 失败'))],
    ['播报', () => mocks.tts.speak.mockRejectedValueOnce(new Error('播放失败'))],
  ] as const)('%s失败时显示可重试中文错误', async (_label, arrange) => {
    arrange();
    render(<VoicePage />);

    fireEvent.click(screen.getByRole('button', { name: '开始说话' }));
    if (_label !== '录音') {
      await waitFor(() => expect(mocks.recognition.startListening).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: '停止听取' }));
    }

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/失败/);
      expect(screen.getByText('点击麦克风重试')).toBeInTheDocument();
    });
  });

  it('hook 暴露的权限或 TTS 错误会同步到页面错误态', async () => {
    const view = render(<VoicePage />);
    mocks.recognition.error = '请允许麦克风权限';
    view.rerender(<VoicePage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('麦克风权限'));

    mocks.recognition.error = null;
    mocks.tts.error = 'MiMo 音频播放失败';
    view.rerender(<VoicePage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('MiMo 音频播放失败'));
  });

  it('卸载页面也会取消 ASR、AI 和 TTS', () => {
    const view = render(<VoicePage />);

    view.unmount();

    expect(mocks.recognition.cancelListening).toHaveBeenCalledOnce();
    expect(mocks.ai.cancelPending).toHaveBeenCalledOnce();
    expect(mocks.tts.stop).toHaveBeenCalledOnce();
  });
});
