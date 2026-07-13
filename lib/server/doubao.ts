// ============================================================
// 桑梓智护 · 豆包（Volcano Engine Ark）LLM 服务端调用
// ------------------------------------------------------------
// 对齐 backend/services/doubao_service.py：
//   - chat: 多轮对话，自动补 system prompt
//   - recognizeIntent: 意图识别，解析 JSON
//   - generateSummary: 对话摘要
//   - 无 API Key 时降级为占位回复，不抛 500（对齐 Python _is_configured 分支）
//
// 密钥安全：本文件仅在服务端 Route Handler 内 import；
//   VOLCANO_ARK_API_KEY 不加 NEXT_PUBLIC_ 前缀，绝不进客户端产物。
// ============================================================

import { ApiError } from './errors';

/** OpenAI 兼容的单条消息。 */
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 意图识别结构化结果。 */
export interface IntentResult {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
}

export class DoubaoError extends ApiError {
  override readonly name = 'DoubaoError';
}

// 老年人医养助手默认 system prompt（对齐 Python _SYSTEM_PROMPT）
const SYSTEM_PROMPT =
  '你是“小护”，桑梓智护的AI语音助手。你是一位温暖亲切的老年人智慧医养助手，' +
  '说话像关心老人的晚辈一样体贴。回复要简洁、通俗易懂，避免专业术语。' +
  '你的职责是帮助老年人管理健康、用药提醒、联系家属、紧急呼叫等。' +
  '请用温暖、积极、鼓励的语气与老人交流。';

const INTENT_TYPES = [
  'health_record',
  'medication_confirm',
  'send_message',
  'make_call',
  'emergency',
  'query_medication',
  'query_health',
  'general_chat',
] as const;

const INTENT_PROMPT =
  '你是一个意图识别引擎。分析用户输入文本，识别用户意图和关键实体。\n' +
  `支持的意图类型：${INTENT_TYPES.join(', ')}\n\n` +
  '请严格按以下JSON格式返回，不要包含其他内容：\n' +
  '{"intent": "<意图类型>", "entities": {<提取的实体>}, "confidence": <0-1的置信度>}\n\n' +
  '实体提取规则：\n' +
  '- health_record: 提取 record_type, values (如 systolic, diastolic, blood_sugar 等)\n' +
  '- medication_confirm: 提取 medicine_name (如有提及)\n' +
  '- send_message: 提取 target_relation (如 女儿、儿子), message_content\n' +
  '- make_call: 提取 target_relation\n' +
  '- emergency: 无需额外实体\n' +
  '- query_medication: 提取 time_range (如 今天、明天)\n' +
  '- query_health: 提取 record_type, time_range\n' +
  '- general_chat: 提取 topic\n';

const SUMMARY_PROMPT =
  '你是一位温暖的对话分析师。请分析以下老年人与AI助手的对话记录，' +
  '生成一段温暖积极的摘要。摘要需要：\n' +
  '1. 提取老人表达的关键需求和期望\n' +
  '2. 总结老人的健康状况和情绪状态\n' +
  '3. 用温暖、积极的语气呈现\n' +
  '4. 突出老人与家属之间的情感连接\n' +
  '5. 控制在200字以内\n\n' +
  '对话记录：\n{conversations}';

const DOUBAO_TIMEOUT_MS = 45_000;

interface DoubaoConfig {
  apiKey: string;
  baseUrl: string;
  modelEndpoint: string;
}

function readConfig(): DoubaoConfig {
  return {
    apiKey: (process.env.VOLCANO_ARK_API_KEY ?? '').trim(),
    baseUrl: (
      process.env.VOLCANO_ARK_BASE_URL ??
      'https://ark.cn-beijing.volces.com/api/v3'
    ).trim(),
    modelEndpoint: (process.env.VOLCANO_ARK_MODEL_ENDPOINT ?? '').trim(),
  };
}

function isConfigured(cfg: DoubaoConfig): boolean {
  return cfg.apiKey !== '' && cfg.modelEndpoint !== '';
}

/** 无 Key 时的占位回复（对齐 Python _placeholder_chat_response）。 */
function placeholderChatResponse(messages: LlmMessage[]): string {
  let lastUserMsg = '';
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserMsg = messages[i].content;
      break;
    }
  }
  return (
    '您好！我是小护，您的智慧医养助手。' +
    `我收到了您的消息：“${lastUserMsg.slice(0, 50)}”。` +
    '目前AI服务正在配置中，稍后将为您提供更好的服务。'
  );
}

interface ArkChoice {
  message?: { content?: string };
}

interface ArkResponse {
  choices?: ArkChoice[];
}

/**
 * 调用 Ark chat/completions（OpenAI 兼容）。
 * 未配置 Key 时返回占位回复；HTTP / 网络错误抛错（由路由转 500）。
 */
async function callLlm(
  messages: LlmMessage[],
  temperature = 0.7,
  maxTokens = 1024,
): Promise<string> {
  const cfg = readConfig();
  if (!isConfigured(cfg)) {
    console.warn(
      '[doubao] LLM 未配置（缺少 VOLCANO_ARK_API_KEY 或 VOLCANO_ARK_MODEL_ENDPOINT），返回占位回复。',
    );
    return placeholderChatResponse(messages);
  }

  const url = `${cfg.baseUrl}/chat/completions`;
  const payload = {
    model: cfg.modelEndpoint,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOUBAO_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!resp.ok) {
      console.error('[doubao] LLM HTTP 错误: %s', resp.status);
      throw new DoubaoError(
        resp.status === 429 ? 429 : 502,
        '豆包LLM服务请求失败',
      );
    }
    let data: ArkResponse;
    try {
      data = (await resp.json()) as ArkResponse;
    } catch {
      throw new DoubaoError(502, '豆包LLM响应格式异常');
    }
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new DoubaoError(502, '豆包LLM响应格式异常');
    }
    return content;
  } catch (err) {
    if (err instanceof DoubaoError) {
      throw err;
    }
    if (controller.signal.aborted) {
      console.error('[doubao] LLM 请求超时');
      throw new DoubaoError(504, '豆包LLM服务响应超时');
    }
    console.error('[doubao] LLM 请求失败');
    throw new DoubaoError(502, '豆包LLM服务不可用');
  } finally {
    clearTimeout(timeout);
  }
}

/** 解析意图 JSON（对齐 Python _parse_intent_response，含 markdown fence 剥离）。 */
function parseIntentResponse(raw: string): IntentResult {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    const lines = cleaned
      .split('\n')
      .filter((l) => !l.trim().startsWith('```'));
    cleaned = lines.join('\n').trim();
  }

  let parsed: {
    intent?: unknown;
    entities?: unknown;
    confidence?: unknown;
  };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    console.warn('[doubao] 意图 JSON 解析失败: %s', raw.slice(0, 200));
    return { intent: 'general_chat', entities: {}, confidence: 0 };
  }

  let intent =
    typeof parsed.intent === 'string' ? parsed.intent : 'general_chat';
  if (!(INTENT_TYPES as readonly string[]).includes(intent)) {
    intent = 'general_chat';
  }

  let entities: Record<string, unknown> = {};
  if (
    parsed.entities &&
    typeof parsed.entities === 'object' &&
    !Array.isArray(parsed.entities)
  ) {
    entities = parsed.entities as Record<string, unknown>;
  }

  let confidence = 0;
  const c = parsed.confidence;
  if (typeof c === 'number') {
    confidence = c;
  } else if (typeof c === 'string') {
    const n = Number(c);
    confidence = Number.isFinite(n) ? n : 0;
  }
  confidence = Math.max(0, Math.min(1, confidence));

  return { intent, entities, confidence };
}

/**
 * 多轮对话。若首条消息不是 system，自动补默认老年人医养 system prompt。
 * 对齐 Python DoubaoService.chat。
 */
export async function chat(messages: LlmMessage[]): Promise<string> {
  const withSystem: LlmMessage[] =
    messages.length === 0 || messages[0].role !== 'system'
      ? [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
      : messages;
  return callLlm(withSystem, 0.7, 1024);
}

/**
 * 意图识别。对齐 Python DoubaoService.recognize_intent。
 * 空文本直接返回 general_chat / 置信度 0。
 */
export async function recognizeIntent(text: string): Promise<IntentResult> {
  if (!text || text.trim() === '') {
    return { intent: 'general_chat', entities: {}, confidence: 0 };
  }
  const messages: LlmMessage[] = [
    { role: 'system', content: INTENT_PROMPT },
    { role: 'user', content: text },
  ];
  const raw = await callLlm(messages, 0.1, 512);
  return parseIntentResponse(raw);
}

/**
 * 生成对话摘要。对齐 Python DoubaoService.generate_summary。
 * 空对话返回空字符串。
 */
export async function generateSummary(
  conversations: LlmMessage[],
): Promise<string> {
  if (conversations.length === 0) return '';
  const convText = conversations
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');
  const prompt = SUMMARY_PROMPT.replace('{conversations}', convText);
  const messages: LlmMessage[] = [
    { role: 'system', content: prompt },
    { role: 'user', content: '请生成对话摘要。' },
  ];
  return callLlm(messages, 0.5, 512);
}
