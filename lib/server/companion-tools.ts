import type { SupabaseClient } from '@supabase/supabase-js';
import { checkAbnormal, RECORD_TYPES, type HealthRecordType } from './health-thresholds';
import type { MimoFunctionTool, MimoToolCall } from './mimo';
import type { AIAction, AIActionStatus, AIActionType } from '@/types/ai';
import type { Database, Json } from '@/types/supabase';

export interface CompanionUser {
  id: string;
  name: string;
  role: string;
}

export interface CompanionConversationMessage {
  role: string;
  content: string;
}

export type CompanionAction = AIAction;

export interface CompanionToolExecution {
  toolCallId: string;
  content: string;
  actions: CompanionAction[];
}

export interface CompanionToolContext {
  supabase: SupabaseClient<Database>;
  user: CompanionUser;
  sourceText: string;
  explicitShareConsent: boolean;
}

const HEALTH_LABELS: Record<HealthRecordType, string> = {
  blood_pressure: '血压',
  blood_sugar: '血糖',
  heart_rate: '心率',
  weight: '体重',
  temperature: '体温',
};

export const COMPANION_TOOLS: MimoFunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'record_health_metric',
      description: '当长辈明确说出健康测量类型和完整数值时，保存一条真实健康记录。信息不完整时不要调用，应先追问。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          record_type: {
            type: 'string',
            enum: [...RECORD_TYPES],
            description: 'blood_pressure 血压；blood_sugar 血糖；heart_rate 心率；weight 体重；temperature 体温',
          },
          systolic: { type: 'number', description: '收缩压，仅血压必填' },
          diastolic: { type: 'number', description: '舒张压，仅血压必填' },
          value: { type: 'number', description: '血糖、心率、体重或体温的数值' },
          measurement_type: {
            type: 'string',
            enum: ['fasting', 'postprandial'],
            description: '血糖测量情境：空腹或餐后',
          },
          measured_at: { type: 'string', description: 'ISO 8601 测量时间；不确定时省略' },
          notes: { type: 'string', description: '长辈明确提到的补充备注' },
          symptoms: { type: 'string', description: '长辈明确提到的症状，不做诊断' },
        },
        required: ['record_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_murmur',
      description: '把长辈值得留存的日常心情、见闻、愿望或生活提醒整理成简短碎碎念。默认私密保存；只有长辈明确同意本次分享时才把 share_with_family 设为 true。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: {
            type: 'string',
            description: '忠于原意、适合家人阅读的第一人称或中性简短摘要，不添加未说过的事实',
            minLength: 1,
            maxLength: 1000,
          },
          share_with_family: {
            type: 'boolean',
            description: '仅当长辈在当前对话中明确同意分享给家属时为 true，否则必须为 false',
          },
        },
        required: ['summary', 'share_with_family'],
      },
    },
  },
];

export function buildCompanionSystemPrompt(user: CompanionUser): string {
  const name = user.name.trim() || '您';
  const toolGuidance = user.role === 'elder'
    ? [
        '你可以调用工具：长辈说出完整的测量类型和数值时，可记录健康信息；信息不完整必须先追问，绝不猜测数值。',
        '长辈分享有留存价值的心情、见闻、愿望或生活提醒时，可整理并私密保存为碎碎念。摘要必须忠于原话，不增加事实。',
        '你可以温和询问“需要我把这条碎碎念同步给家人吗？”。只有长辈明确说“可以、发吧、告诉孩子”等同意或直接要求分享时，share_with_family 才能为 true；沉默、含糊或拒绝都必须为 false。',
      ]
    : [
        '当前是家属账号，只提供日常陪伴与使用说明，不把家属本人的健康数据写入长辈档案，也不代替长辈授权分享碎碎念。',
      ];
  return [
    `你是“智护银龄”的小护，正在陪伴${name}。使用简短、温暖、尊重的中文，像耐心的晚辈一样聊天。`,
    '不要冒充医生，不诊断、不擅自修改药物；遇到胸痛、呼吸困难、意识异常等紧急迹象，应明确建议立即联系家人并拨打急救电话。',
    ...toolGuidance,
    '工具执行后，根据工具结果如实说明“已记录 / 已私密保存 / 已同步 / 未能完成”，不要声称未成功的操作已经完成。',
    '回答将同时显示文字并被朗读，因此避免 Markdown 表格、长列表和生硬术语，通常控制在 2 到 5 句话。',
  ].join('\n');
}

const SHARE_NEGATION_RE = /(?:没有|还没|尚未|未曾|未(?:告诉|发给|分享|同步|通知|转告)|没(?:有|告诉|发给|分享|同步|通知|转告)|不要|不用|不必|不能|不愿|不想|暂时不|先不|别|算了|拒绝)/;
const SHARE_QUESTION_RE = /(?:[?？]$|(?:吗|么|是否|有没有|了没)[呀啊呢，。！!]*$)/;
const AFFIRMATIVE_RE = /^(好|好的|好啊|可以|行|没问题|同意|愿意|发吧|分享吧|同步吧|告诉他们|告诉孩子|就这样)[呀啊吧嘛呢了，。！!]*$/;
const FAMILY_TARGET_SOURCE = '(?:家人|家属|孩子|子女|儿子|女儿|老伴|亲属)';
const OBJECT_SHARE_RE = new RegExp(
  `^(?:把|将).+?(?:(?:告诉|同步|分享|通知|转告)(?:给|到)?|发给)${FAMILY_TARGET_SOURCE}`,
);
const REQUEST_SHARE_RE = new RegExp(
  `^(?:请(?:你|您)?|麻烦(?:你|您)?|帮我|帮忙|替我).*?(?:(?:告诉|同步|分享|通知|转告)(?:给|到)|发给)${FAMILY_TARGET_SOURCE}`,
);
const SHORT_SHARE_RE = new RegExp(
  `^(?:(?:告诉|通知|转告)(?:给|到)?|(?:同步|分享)(?:给|到)|发给)${FAMILY_TARGET_SOURCE}(?:吧|呀|啊|一下)?[，。！!]*$`,
);
const ASSISTANT_SHARE_QUESTION_PREFIX_RE =
  /^(?:是否需要我|是否要我|要不要我|需不需要我|需要我|要我)/;
const ASSISTANT_SHARE_QUESTION_SIGNAL_RE = /(?:是否|要不要|需不需要|吗|么|[?？])/;

function normalizeConsentText(text: string): string {
  return text.trim().replace(/\s+/g, '');
}

function hasClearFamilyShareDirection(normalizedText: string): boolean {
  return OBJECT_SHARE_RE.test(normalizedText)
    || REQUEST_SHARE_RE.test(normalizedText)
    || SHORT_SHARE_RE.test(normalizedText);
}

function isFamilyShareAuthorizationQuestion(text: string): boolean {
  const normalized = normalizeConsentText(text);
  if (!normalized || !ASSISTANT_SHARE_QUESTION_SIGNAL_RE.test(normalized)) return false;

  const prefix = normalized.match(ASSISTANT_SHARE_QUESTION_PREFIX_RE)?.[0];
  if (!prefix) return false;
  const direction = normalized
    .slice(prefix.length)
    .replace(/(?:吗|么|呢|好吗|好不好)?[?？]*$/, '');
  if (!direction || SHARE_NEGATION_RE.test(direction)) return false;
  return hasClearFamilyShareDirection(direction);
}

export function hasExplicitFamilyShareConsent(
  messages: CompanionConversationMessage[],
): boolean {
  const lastUserIndex = messages.findLastIndex((message) => message.role === 'user');
  if (lastUserIndex < 0) return false;
  const current = normalizeConsentText(messages[lastUserIndex].content);
  if (!current) return false;

  const previousAssistant = messages
    .slice(0, lastUserIndex)
    .reverse()
    .find((message) => message.role === 'assistant')
    ?.content ?? '';
  // “没问题”等短肯定只承接上一条明确的分享询问，不能单独授权。
  if (isFamilyShareAuthorizationQuestion(previousAssistant) && AFFIRMATIVE_RE.test(current)) {
    return true;
  }

  if (SHARE_NEGATION_RE.test(current) || SHARE_QUESTION_RE.test(current)) return false;
  return hasClearFamilyShareDirection(current);
}

export function selectMurmurSourceText(
  messages: CompanionConversationMessage[],
): string {
  const userMessages = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content.trim())
    .filter(Boolean);

  for (let index = userMessages.length - 1; index >= 0; index -= 1) {
    const candidate = userMessages[index];
    const normalized = candidate.replace(/\s+/g, '');
    if (Array.from(candidate).length >= 4 && !AFFIRMATIVE_RE.test(normalized)) {
      return Array.from(candidate).slice(0, 4000).join('');
    }
  }
  return Array.from(userMessages.at(-1) ?? '语音对话记录').slice(0, 4000).join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseArguments(value: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('工具参数不是有效 JSON');
  }
  if (!isRecord(parsed)) throw new Error('工具参数必须为对象');
  return parsed;
}

function readNumber(
  args: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): number {
  const value = args[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${key} 数值缺失或超出合理范围`);
  }
  return value;
}

function readOptionalText(
  args: Record<string, unknown>,
  key: string,
  maximum: number,
): string | null {
  const value = args[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error(`${key} 必须为文本`);
  const text = value.trim();
  if (!text) return null;
  if (Array.from(text).length > maximum) throw new Error(`${key} 内容过长`);
  return text;
}

function readMeasuredAt(args: Record<string, unknown>): string {
  const raw = args.measured_at;
  if (raw === undefined || raw === null || raw === '') return new Date().toISOString();
  if (typeof raw !== 'string') throw new Error('measured_at 必须为时间文本');
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) throw new Error('measured_at 时间无效');
  if (timestamp > Date.now() + 5 * 60_000) throw new Error('测量时间不能晚于当前时间');
  return new Date(timestamp).toISOString();
}

function parseHealthValues(args: Record<string, unknown>): {
  recordType: HealthRecordType;
  values: Record<string, unknown>;
  display: string;
} {
  const recordType = args.record_type;
  if (typeof recordType !== 'string' || !(RECORD_TYPES as readonly string[]).includes(recordType)) {
    throw new Error('record_type 不受支持');
  }
  const typedRecordType = recordType as HealthRecordType;

  if (typedRecordType === 'blood_pressure') {
    const systolic = readNumber(args, 'systolic', 40, 300);
    const diastolic = readNumber(args, 'diastolic', 30, 200);
    if (systolic <= diastolic) throw new Error('收缩压应高于舒张压');
    return {
      recordType: typedRecordType,
      values: { systolic, diastolic },
      display: `${systolic}/${diastolic} mmHg`,
    };
  }

  const ranges: Record<Exclude<HealthRecordType, 'blood_pressure'>, [number, number, string]> = {
    blood_sugar: [1, 50, 'mmol/L'],
    heart_rate: [20, 250, '次/分'],
    weight: [10, 300, 'kg'],
    temperature: [30, 45, '℃'],
  };
  const [minimum, maximum, unit] = ranges[typedRecordType];
  const value = readNumber(args, 'value', minimum, maximum);
  if (typedRecordType === 'blood_sugar') {
    const measurementType = args.measurement_type ?? 'fasting';
    if (measurementType !== 'fasting' && measurementType !== 'postprandial') {
      throw new Error('measurement_type 必须为空腹或餐后');
    }
    return {
      recordType: typedRecordType,
      values: { value, measurement_type: measurementType },
      display: `${measurementType === 'fasting' ? '空腹' : '餐后'} ${value} ${unit}`,
    };
  }
  return { recordType: typedRecordType, values: { value }, display: `${value} ${unit}` };
}

function response(
  toolCallId: string,
  ok: boolean,
  message: string,
  actions: CompanionAction[],
): CompanionToolExecution {
  return {
    toolCallId,
    content: JSON.stringify({ ok, message }),
    actions,
  };
}

function action(
  type: AIActionType,
  label: string,
  status: AIActionStatus,
): CompanionAction {
  return { type, label, status, success: status === 'success' };
}

async function recordHealth(
  call: MimoToolCall,
  args: Record<string, unknown>,
  context: CompanionToolContext,
): Promise<CompanionToolExecution> {
  if (context.user.role !== 'elder') {
    return response(call.id, false, '家属账号不能把本人数据写入长辈健康档案。', [
      action('tool_error', '健康记录未保存', 'error'),
    ]);
  }

  const { recordType, values, display } = parseHealthValues(args);
  const notes = readOptionalText(args, 'notes', 500);
  const symptoms = readOptionalText(args, 'symptoms', 500);
  const measuredAt = readMeasuredAt(args);
  const abnormal = checkAbnormal(recordType, values);
  const now = new Date().toISOString();

  const { data, error } = await context.supabase
    .from('oc_health_records')
    .insert({
      user_id: context.user.id,
      record_type: recordType,
      values: values as Json,
      measured_at: measuredAt,
      input_method: 'voice_ai',
      recorded_by: context.user.id,
      is_abnormal: abnormal.is_abnormal,
      abnormal_reason: abnormal.abnormal_reason,
      notes,
      symptoms,
      created_at: now,
    })
    .select('id');

  if (error || !data?.length) {
    return response(call.id, false, '健康记录保存失败，请让长辈稍后重试。', [
      action('tool_error', '健康记录保存失败', 'error'),
    ]);
  }

  return response(call.id, true, `已记录${HEALTH_LABELS[recordType]}：${display}。`, [
    action('health_recorded', `已记录${HEALTH_LABELS[recordType]}`, 'success'),
  ]);
}

async function saveMurmur(
  call: MimoToolCall,
  args: Record<string, unknown>,
  context: CompanionToolContext,
): Promise<CompanionToolExecution> {
  if (context.user.role !== 'elder') {
    return response(call.id, false, '只有长辈账号可以保存碎碎念。', [
      action('tool_error', '碎碎念未保存', 'error'),
    ]);
  }

  const summary = readOptionalText(args, 'summary', 1000);
  if (!summary) throw new Error('summary 不能为空');
  const shareRequested = args.share_with_family === true;
  const now = new Date().toISOString();
  const sourceText = context.sourceText.trim() || '语音对话记录';

  const { data, error } = await context.supabase
    .from('oc_ai_murmurs')
    .insert({
      elder_id: context.user.id,
      source_text: sourceText,
      summary,
      share_status: 'private',
      created_at: now,
      updated_at: now,
    })
    .select('id');

  if (error || !data?.length) {
    return response(call.id, false, '碎碎念保存失败，请稍后重试。', [
      action('tool_error', '碎碎念保存失败', 'error'),
    ]);
  }

  const murmurId = data[0].id;
  const savedAction = action('murmur_saved', '碎碎念已私密保存', 'success');

  if (!shareRequested) {
    return response(call.id, true, '碎碎念已私密保存。可以询问长辈是否需要同步给家人。', [savedAction]);
  }
  if (!context.explicitShareConsent) {
    return response(
      call.id,
      true,
      '碎碎念已私密保存，但当前没有可验证的明确分享同意，因此没有发送。请先明确询问长辈。',
      [savedAction, action('share_consent_required', '等待长辈同意分享', 'warning')],
    );
  }

  const { data: messageIds, error: shareError } = await context.supabase.rpc(
    'oc_share_ai_murmur',
    {
      p_murmur_id: murmurId,
      p_elder_id: context.user.id,
      p_summary: summary,
    },
  );
  if (shareError) {
    return response(call.id, false, '碎碎念已私密保存，但同步给家人失败，请稍后重试。', [
      savedAction,
      action('tool_error', '同步家人失败', 'error'),
    ]);
  }

  const sharedCount = Array.isArray(messageIds) ? messageIds.length : 0;
  if (sharedCount === 0) {
    return response(call.id, true, '碎碎念已私密保存；当前没有已绑定的家属，因此没有发送。', [
      savedAction,
      action('no_family_recipients', '暂无已绑定家属，本次未发送', 'warning'),
    ]);
  }

  return response(call.id, true, `碎碎念已同步给 ${sharedCount} 位已绑定家属。`, [
    { ...savedAction, label: '碎碎念已保存' },
    action('murmur_shared', `已同步 ${sharedCount} 位家属`, 'success'),
  ]);
}

export async function executeCompanionToolCall(
  call: MimoToolCall,
  context: CompanionToolContext,
): Promise<CompanionToolExecution> {
  try {
    const args = parseArguments(call.function.arguments);
    if (call.function.name === 'record_health_metric') {
      return await recordHealth(call, args, context);
    }
    if (call.function.name === 'save_murmur') {
      return await saveMurmur(call, args, context);
    }
    return response(call.id, false, '不支持的工具调用。', [
      action('tool_error', '未知工具', 'error'),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : '工具参数无效';
    return response(call.id, false, `没有执行工具：${message}`, [
      action('tool_error', '工具参数需要确认', 'error'),
    ]);
  }
}
