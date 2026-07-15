// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeMimoChat,
  MimoError,
  synthesizeSpeech,
  transcribeSpeech,
} from '../mimo';

const TEST_KEY = 'test-mimo-key';
const VALID_MP3 = new Uint8Array([0xff, 0xf3, 0x84, 0xc4, 0x00, 0x00]);
const VALID_WAV = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x41, 0x56, 0x45,
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ttsResponse(bytes = VALID_MP3): Response {
  return jsonResponse({
    choices: [{ message: { audio: { data: Buffer.from(bytes).toString('base64') } } }],
  });
}

function asrResponse(content = '今天记得按时吃药。'): Response {
  return jsonResponse({ choices: [{ message: { role: 'assistant', content } }] });
}

describe('server/mimo', () => {
  beforeEach(() => {
    process.env.MIMO_API_KEY = TEST_KEY;
    delete process.env.MIMO_API_BASE_URL;
    delete process.env.MIMO_TTS_MODEL;
    delete process.env.MIMO_ASR_MODEL;
    delete process.env.MIMO_TTS_VOICE;
    delete process.env.MIMO_TIMEOUT_MS;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.MIMO_API_KEY;
    delete process.env.MIMO_API_BASE_URL;
    delete process.env.MIMO_TTS_MODEL;
    delete process.env.MIMO_ASR_MODEL;
    delete process.env.MIMO_TTS_VOICE;
    delete process.env.MIMO_TIMEOUT_MS;
  });

  it('按官方协议发送 assistant 文本、冰糖音色和 api-key', async () => {
    vi.mocked(fetch).mockResolvedValue(ttsResponse());

    const result = await synthesizeSpeech('现在该吃药了。');

    expect(result.bytes).toEqual(VALID_MP3);
    expect(result.contentType).toBe('audio/mpeg');
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.xiaomimimo.com/v1/chat/completions');
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'api-key': TEST_KEY,
    });
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      model: 'mimo-v2.5-tts',
      messages: [{ role: 'assistant', content: '现在该吃药了。' }],
      audio: { format: 'mp3', voice: '冰糖' },
      stream: false,
    });
  });

  it('规范化自定义 base URL 并允许官方内置音色', async () => {
    process.env.MIMO_API_BASE_URL = 'https://region.example/v1/';
    process.env.MIMO_TTS_VOICE = '茉莉';
    vi.mocked(fetch).mockResolvedValue(ttsResponse());

    await synthesizeSpeech('您好');

    expect(fetch).toHaveBeenCalledWith(
      'https://region.example/v1/chat/completions',
      expect.any(Object),
    );
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.audio.voice).toBe('茉莉');
  });

  it('将 WAV 作为唯一 input_audio 并固定中文识别', async () => {
    vi.mocked(fetch).mockResolvedValue(asrResponse());

    const text = await transcribeSpeech(VALID_WAV, 'wav');

    expect(text).toBe('今天记得按时吃药。');
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.model).toBe('mimo-v2.5-asr');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toMatchObject({
      role: 'user',
      content: [{
        type: 'input_audio',
        input_audio: { data: expect.stringMatching(/^data:audio\/wav;base64,/) },
      }],
    });
    expect(body.messages[0].content).toHaveLength(1);
    expect(body.asr_options).toEqual({ language: 'zh' });
    expect(body.stream).toBe(false);
  });

  it('MP3 识别使用 audio/mpeg data URL', async () => {
    vi.mocked(fetch).mockResolvedValue(asrResponse('识别成功'));

    await transcribeSpeech(VALID_MP3, 'mp3');

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.messages[0].content[0].input_audio.data).toMatch(
      /^data:audio\/mpeg;base64,/,
    );
  });

  it('陪伴对话固定使用 mimo-v2.5-pro 并解析工具调用', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call-health',
            type: 'function',
            function: {
              name: 'record_health_metric',
              arguments: '{"record_type":"heart_rate","value":72}',
            },
          }],
        },
      }],
    }));

    const tools = [{
      type: 'function' as const,
      function: {
        name: 'record_health_metric',
        description: '记录健康',
        parameters: { type: 'object' },
      },
    }];
    const result = await completeMimoChat(
      [{ role: 'user', content: '心率七十二' }],
      tools,
    );

    expect(result.toolCalls[0]).toMatchObject({
      id: 'call-health',
      function: { name: 'record_health_metric' },
    });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: 'mimo-v2.5-pro',
      tool_choice: 'auto',
      tools,
      stream: false,
    });
  });

  it('工具执行后的收尾对话不再暴露工具选择', async () => {
    vi.mocked(fetch).mockResolvedValue(asrResponse('已经替您记好了。'));

    const result = await completeMimoChat([
      { role: 'user', content: '心率七十二' },
      { role: 'tool', tool_call_id: 'call-health', content: '{"ok":true}' },
    ]);

    expect(result.content).toBe('已经替您记好了。');
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.model).toBe('mimo-v2.5-pro');
    expect(body).not.toHaveProperty('tools');
    expect(body).not.toHaveProperty('tool_choice');
  });

  it('缺少服务端密钥时在发起网络请求前失败', async () => {
    delete process.env.MIMO_API_KEY;

    await expect(synthesizeSpeech('您好')).rejects.toMatchObject({
      name: 'MimoError',
      kind: 'config',
      status: 503,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('拒绝未知内置音色，避免把任意 data URL 作为 voice', async () => {
    process.env.MIMO_TTS_VOICE = 'not-a-voice';

    await expect(synthesizeSpeech('您好')).rejects.toMatchObject({ kind: 'config' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('拒绝缺失 choices 的 TTS 响应', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ choices: [] }));

    await expect(synthesizeSpeech('您好')).rejects.toMatchObject({ kind: 'schema' });
  });

  it('拒绝非规范 Base64 和伪 MP3 字节', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { audio: { data: '%%%not-base64%%%' } } }],
      }))
      .mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { audio: { data: Buffer.from('plain').toString('base64') } } }],
      }));

    await expect(synthesizeSpeech('第一次')).rejects.toMatchObject({ kind: 'schema' });
    await expect(synthesizeSpeech('第二次')).rejects.toMatchObject({ kind: 'schema' });
  });

  it('空识别文本映射为 no_speech 而不是上游结构损坏', async () => {
    vi.mocked(fetch).mockResolvedValue(asrResponse('   '));

    await expect(transcribeSpeech(VALID_WAV, 'wav')).rejects.toMatchObject({
      kind: 'no_speech',
      status: 422,
    });
  });

  it.each([
    [400, 'upstream'],
    [401, 'auth'],
    [402, 'payment_required'],
    [403, 'forbidden'],
    [404, 'upstream'],
    [421, 'content_filter'],
  ] as const)('HTTP %i 不重试并映射为 %s', async (status, kind) => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: { message: 'safe' } }, status));

    await expect(synthesizeSpeech('您好')).rejects.toMatchObject({ kind });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each([429, 500, 503])('HTTP %i 最多重试两次后成功', async (status) => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: {} }, status))
      .mockResolvedValueOnce(jsonResponse({ error: {} }, status))
      .mockResolvedValueOnce(ttsResponse());

    const pending = synthesizeSpeech('您好');
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toMatchObject({ contentType: 'audio/mpeg' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('网络错误有限重试，且不会把错误正文或密钥拼进异常', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(ttsResponse());

    const pending = synthesizeSpeech('隐私文本');
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ contentType: 'audio/mpeg' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('单次请求超时会中止且不重试', async () => {
    vi.useFakeTimers();
    process.env.MIMO_TIMEOUT_MS = '25';
    vi.mocked(fetch).mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    }));

    const pending = synthesizeSpeech('您好');
    const rejection = expect(pending).rejects.toMatchObject({
      name: 'MimoError',
      kind: 'timeout',
      status: 504,
    });
    await vi.advanceTimersByTimeAsync(25);

    await rejection;
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('所有重试共享单一截止时间，退避也不能把总耗时推过配置', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    process.env.MIMO_TIMEOUT_MS = '25';
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: {} }, 429));
    let outcome: 'pending' | 'resolved' | 'rejected' = 'pending';

    void synthesizeSpeech('您好').then(
      () => { outcome = 'resolved'; },
      () => { outcome = 'rejected'; },
    );
    await vi.advanceTimersByTimeAsync(25);

    expect(outcome).toBe('rejected');
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('公开错误类型不携带密钥、输入文本或上游响应体', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      error: { message: 'upstream-private-body' },
    }, 403));

    let caught: unknown;
    try {
      await synthesizeSpeech('不应进入错误消息的文本');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MimoError);
    const message = (caught as Error).message;
    expect(message).not.toContain(TEST_KEY);
    expect(message).not.toContain('不应进入错误消息的文本');
    expect(message).not.toContain('upstream-private-body');
  });
});
