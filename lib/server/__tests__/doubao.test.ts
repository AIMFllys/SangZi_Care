// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, recognizeIntent } from '../doubao';

const TEST_KEY = 'test-doubao-key';
const USER_TEXT = '不应进入错误或日志的用户文本';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('server/doubao 生产边界', () => {
  beforeEach(() => {
    process.env.VOLCANO_ARK_API_KEY = TEST_KEY;
    process.env.VOLCANO_ARK_MODEL_ENDPOINT = 'test-endpoint';
    process.env.VOLCANO_ARK_BASE_URL = 'https://ark.test/api/v3';
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.VOLCANO_ARK_API_KEY;
    delete process.env.VOLCANO_ARK_MODEL_ENDPOINT;
    delete process.env.VOLCANO_ARK_BASE_URL;
  });

  it('45 秒截止时间会中止上游并映射为安全的 504', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('upstream abort detail'), {
          name: 'AbortError',
        }));
      });
    }));

    const pending = chat([{ role: 'user', content: USER_TEXT }]);
    const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal;

    expect(signal).toBeDefined();
    expect(signal?.aborted).toBe(false);
    const rejection = expect(pending).rejects.toMatchObject({
      status: 504,
      detail: '豆包LLM服务响应超时',
    });
    await vi.advanceTimersByTimeAsync(45_000);

    await rejection;
    expect(signal?.aborted).toBe(true);
  });

  it('上游 HTTP 错误只记录状态并映射为安全的 502', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      error: { message: 'private-upstream-body' },
    }, 500));

    await expect(chat([{ role: 'user', content: USER_TEXT }])).rejects.toMatchObject({
      status: 502,
      detail: '豆包LLM服务请求失败',
    });

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain('500');
    expect(logged).not.toContain('private-upstream-body');
    expect(logged).not.toContain(USER_TEXT);
    expect(logged).not.toContain(TEST_KEY);
  });

  it('网络错误不回显底层异常并映射为安全的 502', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('private-network-detail'));

    await expect(chat([{ role: 'user', content: USER_TEXT }])).rejects.toMatchObject({
      status: 502,
      detail: '豆包LLM服务不可用',
    });

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain('private-network-detail');
    expect(logged).not.toContain(USER_TEXT);
    expect(logged).not.toContain(TEST_KEY);
  });

  it('成功状态但响应结构异常时映射为安全的 502', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ choices: [] }));

    await expect(chat([{ role: 'user', content: USER_TEXT }])).rejects.toMatchObject({
      status: 502,
      detail: '豆包LLM响应格式异常',
    });
  });

  it('意图 JSON 解析失败只记录事件，不记录模型原文', async () => {
    const privateModelText = '老人血压 180/110，家庭住址与聊天正文';
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      choices: [{ message: { content: privateModelText } }],
    }));

    await expect(recognizeIntent(USER_TEXT)).resolves.toEqual({
      intent: 'general_chat',
      entities: {},
      confidence: 0,
    });

    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain('意图 JSON 解析失败');
    expect(logged).not.toContain(privateModelText);
    expect(logged).not.toContain(USER_TEXT);
    expect(logged).not.toContain(TEST_KEY);
  });
});
