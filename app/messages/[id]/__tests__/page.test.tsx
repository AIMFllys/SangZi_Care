import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodePcm16Wav } from '@/lib/audio/wav';

const mocks = vi.hoisted(() => ({
  fetchMessages: vi.fn(),
  sendTextMessage: vi.fn(),
  sendVoiceMessage: vi.fn(),
  markConversationAsRead: vi.fn(),
  fetchBlob: vi.fn(),
  startListening: vi.fn(),
  stopListening: vi.fn(),
  cancelListening: vi.fn(),
  resetTranscript: vi.fn(),
  push: vi.fn(),
  messages: [] as Array<Record<string, unknown>>,
  loading: false,
  recognitionPhase: 'idle',
  recognitionError: null as string | null,
}));

vi.mock('@/stores/messageStore', () => ({
  useMessageStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      messages: mocks.messages,
      loading: mocks.loading,
      error: null,
      fetchMessages: mocks.fetchMessages,
      sendTextMessage: mocks.sendTextMessage,
      sendVoiceMessage: mocks.sendVoiceMessage,
      markConversationAsRead: mocks.markConversationAsRead,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { user: { id: 'user-1', role: 'elder', name: '李奶奶' }, isElder: true };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchBlob: mocks.fetchBlob,
}));

vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    isListening: mocks.recognitionPhase === 'recording',
    transcript: '',
    phase: mocks.recognitionPhase,
    error: mocks.recognitionError,
    currentLevel: 'mimo',
    startListening: mocks.startListening,
    stopListening: mocks.stopListening,
    cancelListening: mocks.cancelListening,
    resetTranscript: mocks.resetTranscript,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useParams: () => ({ id: 'contact-1' }),
}));

const createObjectURL = vi.fn(() => 'blob:voice');
const revokeObjectURL = vi.fn();
Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

class MockAudio {
  static instances: MockAudio[] = [];
  static throwOnConstruct = false;
  src: string;
  preload = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();

  constructor(src = '') {
    if (MockAudio.throwOnConstruct) throw new Error('Audio 构造失败');
    this.src = src;
    MockAudio.instances.push(this);
  }
}

vi.stubGlobal('Audio', MockAudio);

const { default: ChatDetailPage } = await import('../ChatDetail');

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function voiceMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'voice-1', sender_id: 'contact-1', receiver_id: 'user-1', type: 'voice',
    content: '语音转写', audio_url: '/api/v1/voice/audio?message_id=voice-1',
    audio_duration: 2.45, is_ai_generated: false, is_read: true, read_at: null,
    created_at: '2026-07-13T10:00:00Z', ...overrides,
  };
}

async function openVoiceRecorder(): Promise<void> {
  fireEvent.click(screen.getByTestId('mode-toggle'));
  expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
}

async function recordTranscript(expected = '今天记得吃药'): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
  await waitFor(() => expect(mocks.startListening).toHaveBeenCalled());
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '停止录音' }));
  });
  await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument());
}

describe('ChatDetailPage 真实语音消息', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockAudio.instances = [];
    MockAudio.throwOnConstruct = false;
    mocks.messages = [];
    mocks.loading = false;
    mocks.recognitionPhase = 'idle';
    mocks.recognitionError = null;
    mocks.fetchMessages.mockResolvedValue(undefined);
    mocks.sendTextMessage.mockResolvedValue({});
    mocks.sendVoiceMessage.mockResolvedValue({});
    mocks.markConversationAsRead.mockResolvedValue(undefined);
    mocks.fetchBlob.mockResolvedValue(WAV);
    mocks.startListening.mockResolvedValue(undefined);
    mocks.stopListening.mockResolvedValue({
      transcript: '今天记得吃药', audioBlob: WAV, durationMs: 2_450,
    });
  });

  it('渲染、加载会话并保留文字发送', async () => {
    render(<ChatDetailPage />);
    expect(screen.getByText('对话')).toBeInTheDocument();
    expect(mocks.fetchMessages).toHaveBeenCalledWith('contact-1');
    fireEvent.change(screen.getByTestId('text-input'), { target: { value: '你好啊' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    await waitFor(() => {
      expect(mocks.sendTextMessage).toHaveBeenCalledWith('user-1', 'contact-1', '你好啊');
    });
  });

  it('语音录制器发送 Blob、真实时长和可中止信号', async () => {
    render(<ChatDetailPage />);
    await openVoiceRecorder();
    fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
    await waitFor(() => expect(mocks.startListening).toHaveBeenCalledOnce());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '停止录音' }));
    });
    fireEvent.click(screen.getByRole('button', { name: '发送语音消息' }));

    await waitFor(() => {
      expect(mocks.sendVoiceMessage).toHaveBeenCalledWith(
        'user-1',
        'contact-1',
        expect.objectContaining({
          content: '今天记得吃药', audioBlob: WAV, durationMs: 2_450,
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  it('转写自动进入可编辑文字草稿，编辑后只发送文字消息', async () => {
    render(<ChatDetailPage />);
    await openVoiceRecorder();
    await recordTranscript();

    fireEvent.click(screen.getByRole('button', { name: '编辑转写文字' }));
    const input = screen.getByTestId('text-input');
    expect(input).toHaveValue('今天记得吃药');

    fireEvent.change(input, { target: { value: '今天记得吃药，别忘了' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => {
      expect(mocks.sendTextMessage).toHaveBeenCalledWith(
        'user-1',
        'contact-1',
        '今天记得吃药，别忘了',
      );
    });
    expect(mocks.sendVoiceMessage).not.toHaveBeenCalled();
  });

  it('转写完成即种入父级草稿，从模式按钮进入文字时仍可发送', async () => {
    render(<ChatDetailPage />);
    await openVoiceRecorder();
    await recordTranscript();

    expect(screen.getByRole('status')).toHaveTextContent('转写已加入文字草稿');
    fireEvent.click(screen.getByRole('button', { name: '切换到文字模式' }));

    expect(screen.getByTestId('text-input')).toHaveValue('今天记得吃药');
    expect(screen.getByRole('button', { name: '发送消息' })).toBeEnabled();
  });

  it('已有手输草稿时不覆盖，只在用户确认后追加转写', async () => {
    render(<ChatDetailPage />);
    fireEvent.change(screen.getByTestId('text-input'), { target: { value: '这是手动输入' } });
    await openVoiceRecorder();
    await recordTranscript();

    expect(screen.getByRole('status')).toHaveTextContent('已有文字草稿，转写未覆盖');
    fireEvent.click(screen.getByRole('button', {
      name: '将转写追加到已有文字并编辑',
    }));

    expect(screen.getByTestId('text-input')).toHaveValue('这是手动输入 今天记得吃药');
    expect(screen.getByTestId('text-input')).toHaveFocus();
  });

  it('直接发送语音成功后清理自动转写副本，不会重复发送', async () => {
    render(<ChatDetailPage />);
    await openVoiceRecorder();
    await recordTranscript();

    fireEvent.click(screen.getByRole('button', { name: '发送语音消息' }));
    await waitFor(() => expect(mocks.sendVoiceMessage).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: '切换到文字模式' }));

    expect(screen.getByTestId('text-input')).toHaveValue('');
    expect(mocks.sendTextMessage).not.toHaveBeenCalled();
  });

  it('取消转写会只清理自动种入的副本', async () => {
    render(<ChatDetailPage />);
    await openVoiceRecorder();
    await recordTranscript();

    fireEvent.click(screen.getByRole('button', { name: '取消录音' }));
    fireEvent.click(screen.getByRole('button', { name: '切换到文字模式' }));

    expect(screen.getByTestId('text-input')).toHaveValue('');
  });

  it.each([
    {
      name: '空转写',
      stop: () => Promise.resolve({ transcript: '   ', audioBlob: WAV, durationMs: 2_450 }),
      error: '未识别到有效语音',
    },
    {
      name: 'ASR 失败',
      stop: () => Promise.reject(new Error('语音识别服务暂时不可用')),
      error: '语音识别服务暂时不可用',
    },
  ])('$name 不修改已有手输草稿', async ({ stop, error }) => {
    mocks.stopListening.mockImplementationOnce(stop);
    render(<ChatDetailPage />);
    fireEvent.change(screen.getByTestId('text-input'), { target: { value: '保留我的手输内容' } });
    await openVoiceRecorder();
    fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
    await waitFor(() => expect(mocks.startListening).toHaveBeenCalledOnce());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '停止录音' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(error);
    fireEvent.click(screen.getByRole('button', { name: '切换到文字模式' }));
    expect(screen.getByTestId('text-input')).toHaveValue('保留我的手输内容');
  });

  it('上传失败显示错误且不会伪装已发送', async () => {
    mocks.sendVoiceMessage.mockRejectedValue(new Error('语音上传失败'));
    render(<ChatDetailPage />);
    await openVoiceRecorder();
    fireEvent.click(screen.getByRole('button', { name: '开始录音' }));
    await waitFor(() => expect(mocks.startListening).toHaveBeenCalledOnce());
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '停止录音' })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '发送语音消息' })));

    expect(screen.getByRole('alert')).toHaveTextContent('语音上传失败');
    expect(screen.getByText('今天记得吃药')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑转写文字' }));
    expect(screen.getByTestId('text-input')).toHaveValue('今天记得吃药');
  });

  it('播放按钮通过鉴权下载真实音频，不再用 TTS 朗读转写', async () => {
    mocks.messages = [voiceMessage()];
    render(<ChatDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /播放语音消息/ }));

    await waitFor(() => expect(mocks.fetchBlob).toHaveBeenCalledWith(
      '/api/v1/voice/audio?message_id=voice-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    expect(createObjectURL).toHaveBeenCalledWith(WAV);
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].play).toHaveBeenCalledOnce();
  });

  it('播放中再次点击同一条消息会在这一次点击中重新播放', async () => {
    mocks.messages = [voiceMessage()];
    render(<ChatDetailPage />);
    const play = screen.getByRole('button', { name: /播放语音消息/ });

    fireEvent.click(play);
    await waitFor(() => expect(MockAudio.instances).toHaveLength(1));
    fireEvent.click(play);

    await waitFor(() => expect(mocks.fetchBlob).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(MockAudio.instances).toHaveLength(2));
    expect(MockAudio.instances[0].pause).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:voice');
    expect(MockAudio.instances[1].play).toHaveBeenCalledOnce();
  });

  it('首个下载仍悬挂时切换消息会中止它，并隔离迟到完成', async () => {
    const firstDownload = deferred<Blob>();
    const lateBlob = makeWavBlob(1_000);
    mocks.fetchBlob
      .mockReturnValueOnce(firstDownload.promise)
      .mockResolvedValueOnce(WAV);
    mocks.messages = [
      voiceMessage(),
      voiceMessage({ id: 'voice-2', audio_url: '/api/v1/voice/audio?message_id=voice-2' }),
    ];
    render(<ChatDetailPage />);
    const buttons = screen.getAllByRole('button', { name: /播放语音消息/ });

    fireEvent.click(buttons[0]);
    const firstSignal = mocks.fetchBlob.mock.calls[0][1].signal as AbortSignal;
    fireEvent.click(buttons[1]);

    expect(firstSignal.aborted).toBe(true);
    await waitFor(() => expect(MockAudio.instances).toHaveLength(1));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledWith(WAV);

    await act(async () => {
      firstDownload.resolve(lateBlob);
      await firstDownload.promise;
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].pause).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('播放结束或 Audio 报错都会暂停、撤销 URL 并释放当前操作', async () => {
    mocks.messages = [voiceMessage()];
    render(<ChatDetailPage />);
    const play = screen.getByRole('button', { name: /播放语音消息/ });

    fireEvent.click(play);
    await waitFor(() => expect(MockAudio.instances).toHaveLength(1));
    const firstSignal = mocks.fetchBlob.mock.calls[0][1].signal as AbortSignal;
    act(() => MockAudio.instances[0].onended?.());

    expect(firstSignal.aborted).toBe(true);
    expect(MockAudio.instances[0].pause).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();

    fireEvent.click(play);
    await waitFor(() => expect(MockAudio.instances).toHaveLength(2));
    const secondSignal = mocks.fetchBlob.mock.calls[1][1].signal as AbortSignal;
    act(() => MockAudio.instances[1].onerror?.());

    expect(secondSignal.aborted).toBe(true);
    expect(MockAudio.instances[1].pause).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('alert')).toHaveTextContent('语音播放失败，请重试');
  });

  it('下载悬挂时卸载会中止请求，并忽略卸载后的迟到 Blob', async () => {
    const download = deferred<Blob>();
    mocks.fetchBlob.mockReturnValue(download.promise);
    mocks.messages = [voiceMessage()];
    const view = render(<ChatDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: /播放语音消息/ }));
    const signal = mocks.fetchBlob.mock.calls[0][1].signal as AbortSignal;
    view.unmount();

    expect(signal.aborted).toBe(true);
    await act(async () => {
      download.resolve(WAV);
      await download.promise;
    });
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(MockAudio.instances).toHaveLength(0);
  });

  it('切换播放和卸载会暂停、撤销 Blob URL 并中止请求', async () => {
    mocks.messages = [
      voiceMessage(),
      voiceMessage({ id: 'voice-2', audio_url: '/api/v1/voice/audio?message_id=voice-2' }),
    ];
    const view = render(<ChatDetailPage />);
    const buttons = screen.getAllByRole('button', { name: /播放语音消息/ });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(MockAudio.instances).toHaveLength(1));
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(MockAudio.instances).toHaveLength(2));

    expect(MockAudio.instances[0].pause).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:voice');
    view.unmount();
    expect(MockAudio.instances[1].pause).toHaveBeenCalledOnce();
  });

  it('缺失音频或播放失败显示可操作错误', async () => {
    mocks.messages = [voiceMessage({ audio_url: null })];
    const view = render(<ChatDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /播放语音消息/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('语音文件不可用');

    mocks.messages = [voiceMessage()];
    mocks.fetchBlob.mockRejectedValue(new Error('网络失败'));
    view.rerender(<ChatDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /播放语音消息/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('网络失败'));
  });

  it('Audio 构造失败也会撤销已创建的 Blob URL', async () => {
    MockAudio.throwOnConstruct = true;
    mocks.messages = [voiceMessage()];
    render(<ChatDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: /播放语音消息/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Audio 构造失败'));
    expect(createObjectURL).toHaveBeenCalledWith(WAV);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:voice');
  });

  it('播放错误后切到语音模式会清除错误，避免覆盖录音操作', async () => {
    mocks.messages = [voiceMessage()];
    mocks.fetchBlob.mockRejectedValue(new Error('网络失败'));
    render(<ChatDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /播放语音消息/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('网络失败'));

    fireEvent.click(screen.getByRole('button', { name: '切换到语音模式' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
  });

  it('已在语音模式时产生播放错误也不会移除或禁用录音操作', async () => {
    mocks.messages = [voiceMessage()];
    mocks.fetchBlob.mockRejectedValue(new Error('网络失败'));
    render(<ChatDetailPage />);
    await openVoiceRecorder();

    fireEvent.click(screen.getByRole('button', { name: /播放语音消息/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('网络失败'));
    expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始录音' })).toBeEnabled();
  });

  it('visualViewport 不可用时跟随 window resize 恢复真实聊天高度', () => {
    const viewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    const heightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 640 });

    const view = render(<ChatDetailPage />);
    expect(document.documentElement.style.getPropertyValue('--chat-viewport-height')).toBe('640px');

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 });
    act(() => window.dispatchEvent(new Event('resize')));
    expect(document.documentElement.style.getPropertyValue('--chat-viewport-height')).toBe('480px');

    view.unmount();
    if (viewportDescriptor) Object.defineProperty(window, 'visualViewport', viewportDescriptor);
    else delete (window as unknown as Record<string, unknown>).visualViewport;
    if (heightDescriptor) Object.defineProperty(window, 'innerHeight', heightDescriptor);
  });

  it('返回消息列表并标记收到的未读消息', () => {
    mocks.messages = [voiceMessage({ is_read: false })];
    render(<ChatDetailPage />);
    expect(mocks.markConversationAsRead).toHaveBeenCalledWith('contact-1');
    fireEvent.click(screen.getByLabelText('返回消息列表'));
    expect(mocks.push).toHaveBeenCalledWith('/messages');
  });
});
