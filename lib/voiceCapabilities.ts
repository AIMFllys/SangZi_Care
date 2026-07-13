// ============================================================
// 桑梓智护 — 语音能力检测
// MiMo 语音优先；浏览器语音仅作为显式后备
// ============================================================

/** 语音能力级别 */
export type VoiceLevel = 'mimo' | 'web';

/** 检测结果：按优先级排序的可用级别数组 */
export interface VoiceCapabilities {
  tts: VoiceLevel[];
  asr: VoiceLevel[];
}

// ------ 单项检测 ------

function isWebTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function isWebASRAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

// ------ 主检测函数 ------

/**
 * 检测当前环境可用的语音能力，返回按优先级排序的级别数组。
 * TTS/ASR 均使用 MiMo > Web，不再依赖 Android Native 或旧语音服务。
 */
export async function detect(): Promise<VoiceCapabilities> {
  const tts: VoiceLevel[] = ['mimo'];
  if (isWebTTSAvailable()) tts.push('web');

  const asr: VoiceLevel[] = ['mimo'];
  if (isWebASRAvailable()) asr.push('web');

  return { tts, asr };
}
