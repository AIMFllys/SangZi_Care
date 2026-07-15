const DEFAULT_BASE_URL = 'https://api.xiaomimimo.com/v1';
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([429, 500, 503]);

const BUILT_IN_VOICES = [
  'mimo_default',
  '冰糖',
  '茉莉',
  '苏打',
  '白桦',
  'Mia',
  'Chloe',
  'Milo',
  'Dean',
] as const;

export type MimoVoice = (typeof BUILT_IN_VOICES)[number];
export type MimoAudioFormat = 'wav' | 'mp3';
export type MimoErrorKind =
  | 'config'
  | 'auth'
  | 'payment_required'
  | 'forbidden'
  | 'content_filter'
  | 'rate_limit'
  | 'upstream'
  | 'timeout'
  | 'schema'
  | 'no_speech';

export class MimoError extends Error {
  constructor(
    message: string,
    readonly kind: MimoErrorKind,
    readonly status: number,
    readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = 'MimoError';
  }
}

export interface SynthesizedSpeech {
  bytes: Uint8Array;
  contentType: 'audio/mpeg';
}

interface MimoConfig {
  apiKey: string;
  baseUrl: string;
  ttsModel: string;
  asrModel: string;
  voice: MimoVoice;
  timeoutMs: number;
}

interface SynthesizeOptions {
  voice?: MimoVoice;
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new MimoError('MiMo 超时配置无效', 'config', 503);
  }
  return parsed;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      throw new Error('insecure');
    }
  } catch {
    throw new MimoError('MiMo API 地址配置无效', 'config', 503);
  }
  return trimmed;
}

function parseVoice(value: string): MimoVoice {
  if ((BUILT_IN_VOICES as readonly string[]).includes(value)) {
    return value as MimoVoice;
  }
  throw new MimoError('MiMo 音色配置无效', 'config', 503);
}

function getConfig(): MimoConfig {
  const apiKey = process.env.MIMO_API_KEY?.trim();
  if (!apiKey) {
    throw new MimoError('MiMo 语音服务未配置', 'config', 503);
  }

  return {
    apiKey,
    baseUrl: normalizeBaseUrl(process.env.MIMO_API_BASE_URL ?? DEFAULT_BASE_URL),
    ttsModel: process.env.MIMO_TTS_MODEL?.trim() || 'mimo-v2.5-tts',
    asrModel: process.env.MIMO_ASR_MODEL?.trim() || 'mimo-v2.5-asr',
    voice: parseVoice(process.env.MIMO_TTS_VOICE?.trim() || '冰糖'),
    timeoutMs: readPositiveInteger(process.env.MIMO_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  };
}

function mapHttpError(status: number): MimoError {
  switch (status) {
    case 401:
      return new MimoError('MiMo 语音服务鉴权失败', 'auth', 502, status);
    case 402:
      return new MimoError('MiMo 语音服务额度不足', 'payment_required', 503, status);
    case 403:
      return new MimoError('MiMo 语音服务当前不可用', 'forbidden', 502, status);
    case 421:
      return new MimoError('语音内容未通过安全检查', 'content_filter', 422, status);
    case 429:
      return new MimoError('MiMo 语音服务请求过于频繁', 'rate_limit', 429, status);
    default:
      return new MimoError('MiMo 语音上游请求失败', 'upstream', 502, status);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function timeoutError(): MimoError {
  return new MimoError('MiMo 语音服务响应超时', 'timeout', 504);
}

async function retryDelay(attempt: number, deadline: number): Promise<void> {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) throw timeoutError();

  const preferredDelayMs = 100 * 2 ** attempt + Math.floor(Math.random() * 50);
  await new Promise((resolve) => {
    setTimeout(resolve, Math.min(preferredDelayMs, remainingMs));
  });
  if (Date.now() >= deadline) throw timeoutError();
}

async function requestMimo(body: unknown, config: MimoConfig): Promise<unknown> {
  const url = `${config.baseUrl}/chat/completions`;
  const deadline = Date.now() + config.timeoutMs;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw timeoutError();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (controller.signal.aborted || isAbortError(error)) {
        throw timeoutError();
      }
      if (attempt < MAX_ATTEMPTS - 1) {
        await retryDelay(attempt, deadline);
        continue;
      }
      throw new MimoError('无法连接 MiMo 语音服务', 'upstream', 502);
    }

    if (!response.ok) {
      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS - 1) {
        clearTimeout(timeout);
        void response.body?.cancel().catch(() => undefined);
        await retryDelay(attempt, deadline);
        continue;
      }
      clearTimeout(timeout);
      throw mapHttpError(response.status);
    }

    try {
      const payload = await response.json();
      clearTimeout(timeout);
      if (Date.now() >= deadline) throw timeoutError();
      return payload;
    } catch (error) {
      clearTimeout(timeout);
      if (controller.signal.aborted || isAbortError(error)) {
        throw timeoutError();
      }
      if (error instanceof MimoError) throw error;
      throw new MimoError('MiMo 返回了无法解析的响应', 'schema', 502);
    }
  }

  throw new MimoError('MiMo 语音上游请求失败', 'upstream', 502);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function decodeStrictBase64(value: unknown): Uint8Array {
  if (typeof value !== 'string') {
    throw new MimoError('MiMo 音频响应缺失', 'schema', 502);
  }
  const encoded = value.trim();
  const valid =
    encoded.length > 0 &&
    encoded.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded);
  if (!valid) {
    throw new MimoError('MiMo 音频响应编码无效', 'schema', 502);
  }

  const bytes = new Uint8Array(Buffer.from(encoded, 'base64'));
  if (bytes.byteLength === 0 || Buffer.from(bytes).toString('base64') !== encoded) {
    throw new MimoError('MiMo 音频响应编码无效', 'schema', 502);
  }
  return bytes;
}

function hasMp3Header(bytes: Uint8Array): boolean {
  const hasId3 =
    bytes.byteLength >= 3 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x44 &&
    bytes[2] === 0x33;
  const hasFrameSync =
    bytes.byteLength >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return hasId3 || hasFrameSync;
}

function hasWavHeader(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  );
}

function readTtsAudio(payload: unknown): SynthesizedSpeech {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new MimoError('MiMo 语音响应结构无效', 'schema', 502);
  }
  const first = payload.choices[0];
  const data =
    isRecord(first) &&
    isRecord(first.message) &&
    isRecord(first.message.audio)
      ? first.message.audio.data
      : undefined;
  const bytes = decodeStrictBase64(data);
  if (!hasMp3Header(bytes)) {
    throw new MimoError('MiMo 返回的音频格式无效', 'schema', 502);
  }
  return { bytes, contentType: 'audio/mpeg' };
}

function readTranscript(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new MimoError('MiMo 识别响应结构无效', 'schema', 502);
  }
  const first = payload.choices[0];
  const content = isRecord(first) && isRecord(first.message)
    ? first.message.content
    : undefined;
  if (typeof content !== 'string') {
    throw new MimoError('MiMo 识别响应结构无效', 'schema', 502);
  }
  const transcript = content.trim();
  if (!transcript) {
    throw new MimoError('未识别到有效语音', 'no_speech', 422);
  }
  return transcript;
}

export async function synthesizeSpeech(
  text: string,
  options: SynthesizeOptions = {},
): Promise<SynthesizedSpeech> {
  const targetText = text.trim();
  if (!targetText) {
    throw new MimoError('语音合成文本不能为空', 'schema', 400);
  }
  const config = getConfig();
  const voice = options.voice ? parseVoice(options.voice) : config.voice;
  const payload = await requestMimo({
    model: config.ttsModel,
    messages: [{ role: 'assistant', content: targetText }],
    audio: { format: 'mp3', voice },
    stream: false,
  }, config);
  return readTtsAudio(payload);
}

export async function transcribeSpeech(
  audio: Uint8Array,
  format: MimoAudioFormat,
): Promise<string> {
  if (audio.byteLength === 0) {
    throw new MimoError('语音文件为空', 'schema', 400);
  }
  if ((format === 'wav' && !hasWavHeader(audio)) || (format === 'mp3' && !hasMp3Header(audio))) {
    throw new MimoError('语音文件格式无效', 'schema', 400);
  }

  const config = getConfig();
  const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
  const payload = await requestMimo({
    model: config.asrModel,
    messages: [{
      role: 'user',
      content: [{
        type: 'input_audio',
        input_audio: {
          data: `data:${mime};base64,${Buffer.from(audio).toString('base64')}`,
        },
      }],
    }],
    asr_options: { language: 'zh' },
    stream: false,
  }, config);
  return readTranscript(payload);
}

export type MimoChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface MimoToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface MimoChatMessage {
  role: MimoChatRole;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: MimoToolCall[];
}

export interface MimoFunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface MimoChatTurn {
  content: string;
  toolCalls: MimoToolCall[];
}

const COMPANION_CHAT_MODEL = 'mimo-v2.5-pro';
const MAX_TOOL_CALLS = 5;
const MAX_TOOL_ARGUMENT_CHARACTERS = 16_000;

function readToolCalls(value: unknown): MimoToolCall[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_TOOL_CALLS) {
    throw new MimoError('MiMo 工具调用响应无效', 'schema', 502);
  }

  return value.map((item) => {
    if (
      !isRecord(item)
      || typeof item.id !== 'string'
      || !item.id.trim()
      || item.type !== 'function'
      || !isRecord(item.function)
      || typeof item.function.name !== 'string'
      || !item.function.name.trim()
      || typeof item.function.arguments !== 'string'
      || item.function.arguments.length > MAX_TOOL_ARGUMENT_CHARACTERS
    ) {
      throw new MimoError('MiMo 工具调用响应无效', 'schema', 502);
    }

    return {
      id: item.id,
      type: 'function',
      function: {
        name: item.function.name,
        arguments: item.function.arguments,
      },
    };
  });
}

function readChatTurn(payload: unknown): MimoChatTurn {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new MimoError('MiMo 对话响应结构无效', 'schema', 502);
  }
  const first = payload.choices[0];
  if (!isRecord(first) || !isRecord(first.message)) {
    throw new MimoError('MiMo 对话响应结构无效', 'schema', 502);
  }

  const content = first.message.content;
  if (content !== null && content !== undefined && typeof content !== 'string') {
    throw new MimoError('MiMo 对话响应结构无效', 'schema', 502);
  }
  const toolCalls = readToolCalls(first.message.tool_calls);
  const normalizedContent = typeof content === 'string' ? content.trim() : '';
  if (!normalizedContent && toolCalls.length === 0) {
    throw new MimoError('MiMo 对话响应内容为空', 'schema', 502);
  }

  return { content: normalizedContent, toolCalls };
}

/**
 * 固定使用 MiMo v2.5 Pro 完成陪伴对话；tools 为空时用于工具执行后的自然语言收尾。
 */
export async function completeMimoChat(
  messages: MimoChatMessage[],
  tools: MimoFunctionTool[] = [],
): Promise<MimoChatTurn> {
  if (messages.length === 0) {
    throw new MimoError('MiMo 对话消息不能为空', 'schema', 400);
  }

  const config = getConfig();
  const payload = await requestMimo({
    model: COMPANION_CHAT_MODEL,
    messages,
    ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
    stream: false,
  }, config);
  return readChatTurn(payload);
}
