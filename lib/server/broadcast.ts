// ============================================================
// 桑梓智护 · 健康广播服务端服务层
// ------------------------------------------------------------
// 对齐 backend/services/health_broadcast.py：
//   - BROADCAST_CATEGORIES:        静态广播分类常量（6 项）
//   - buildRecommendFilters:       根据用户信息构建推荐过滤条件
//   - generateBroadcastText:       调豆包 LLM 生成广播文案
//   - generateAudio:               调火山 TTS 合成音频（当前 audio_bytes 不落库，仅取估算时长）
//
// 密钥安全：本文件仅在服务端 Route Handler 内 import；
//   LLM / TTS 密钥由 doubao.ts / voice.ts 各自读取，绝不进 NEXT_PUBLIC_*。
// ============================================================

import { chat, type LlmMessage } from './doubao';
import { textToSpeech } from './voice';

// ---------- 广播分类（对齐 Python BROADCAST_CATEGORIES） ----------

export interface BroadcastCategory {
  key: string;
  name: string;
  description: string;
}

export const BROADCAST_CATEGORIES: BroadcastCategory[] = [
  { key: '养生保健', name: '养生保健', description: '日常养生保健知识' },
  { key: '慢病管理', name: '慢病管理', description: '慢性病管理与防治' },
  { key: '季节养生', name: '季节养生', description: '四季养生要点' },
  { key: '心理健康', name: '心理健康', description: '心理调适与情绪管理' },
  { key: '饮食营养', name: '饮食营养', description: '合理膳食与营养搭配' },
  { key: '运动健身', name: '运动健身', description: '适合老年人的运动方式' },
];

// ---------- 季节与年龄工具（对齐 Python _get_current_season / _calculate_age） ----------

/** 根据当前月份返回季节名称（对齐 Python _get_current_season，用 UTC）。 */
function getCurrentSeason(): string {
  const month = new Date().getUTCMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return '春季';
  if (month >= 6 && month <= 8) return '夏季';
  if (month >= 9 && month <= 11) return '秋季';
  return '冬季';
}

/** 根据出生日期字符串计算年龄；无法解析返回 null（对齐 Python _calculate_age）。 */
function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < born.getUTCDate())) {
    age--;
  }
  return age;
}

// ---------- 推荐过滤条件 ----------

/** recommend 端点查询 users 时所需的最小用户信息。 */
export interface RadioUserInfo {
  birth_date?: string | null;
  chronic_diseases?: string[] | null;
}

/** buildRecommendFilters 返回的过滤条件。 */
export interface RecommendFilters {
  age: number | null;
  diseases: string[];
  season: string;
}

/**
 * 根据用户信息构建推荐过滤条件。
 * 对齐 Python HealthBroadcastService.build_recommend_filters。
 */
export function buildRecommendFilters(user: RadioUserInfo): RecommendFilters {
  return {
    age: calculateAge(user.birth_date),
    diseases: user.chronic_diseases ?? [],
    season: getCurrentSeason(),
  };
}

// ---------- LLM 生成广播文本 ----------

export interface GenerateBroadcastTextParams {
  category: string;
  topic?: string | null;
  target_diseases?: string[] | null;
}

export interface GeneratedBroadcastText {
  title: string;
  content: string;
  ai_prompt: string;
}

/**
 * 使用豆包 LLM 生成广播文本内容。
 * 对齐 Python HealthBroadcastService.generate_broadcast_text。
 * 无 Key 时 chat 内部降级为占位回复，不抛 500。
 */
export async function generateBroadcastText(
  params: GenerateBroadcastTextParams,
): Promise<GeneratedBroadcastText> {
  const { category, topic, target_diseases } = params;

  const diseaseHint =
    target_diseases && target_diseases.length > 0
      ? `，特别关注以下慢性病人群：${target_diseases.join('、')}`
      : '';
  const topicHint = topic ? `，主题为：${topic}` : '';

  const prompt =
    `请为老年人生成一段健康广播内容，分类为「${category}」${topicHint}${diseaseHint}。\n` +
    '要求：\n' +
    '1. 标题简洁明了，不超过20字\n' +
    '2. 内容通俗易懂，适合老年人收听\n' +
    '3. 内容控制在300字以内\n' +
    '4. 语气温暖亲切\n\n' +
    '请严格按以下格式返回：\n' +
    '标题：<标题内容>\n' +
    '内容：<正文内容>';

  const messages: LlmMessage[] = [
    {
      role: 'system',
      content: '你是一位专业的老年健康科普编辑，擅长用通俗易懂的语言撰写健康知识。',
    },
    { role: 'user', content: prompt },
  ];

  const raw = await chat(messages);

  // 解析标题和内容（对齐 Python 的 split 逻辑：用 indexOf 复刻 maxsplit=1 行为）
  let title = category;
  let content = raw;
  if (raw.includes('标题：') && raw.includes('内容：')) {
    const contentIdx = raw.indexOf('内容：');
    const titlePart = raw.slice(0, contentIdx);
    content = raw.slice(contentIdx + '内容：'.length).trim();
    const titleIdx = titlePart.indexOf('标题：');
    if (titleIdx !== -1) {
      title = titlePart.slice(titleIdx + '标题：'.length).trim();
    }
  }

  return {
    title,
    content,
    ai_prompt: prompt,
  };
}

// ---------- TTS 生成音频（仅取估算时长） ----------

/**
 * 使用火山 TTS 将文本转为音频，返回估算时长。
 * 对齐 Python HealthBroadcastService.generate_audio：
 *   - speed=0.9（老年人稍慢语速）
 *   - 时长估算：char_count / (4 * 0.9)，round(_, 1)
 * 当前 audio_bytes 不落库（health_broadcasts 表无二进制列，与 Python 一致），
 * 故仅返回 duration；仍调用 textToSpeech 以对齐 Python 触发语音服务路径。
 */
export async function generateAudio(
  text: string,
): Promise<{ duration: number }> {
  await textToSpeech(text, 0.9);
  const charCount = text.length;
  const estimatedDuration = charCount / (4 * 0.9);
  return { duration: Math.round(estimatedDuration * 10) / 10 };
}
