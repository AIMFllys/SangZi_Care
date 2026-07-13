// ============================================================
// 桑梓智护 — 语音能力检测
// MiMo 语音优先；浏览器语音仅作为显式后备
// ============================================================

import { jsBridge } from '@/lib/jsbridge';

/** 语音能力级别 */
export type VoiceLevel = 'mimo' | 'web' | 'native' | 'doubao';

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

async function isNativeASRAvailable(): Promise<boolean> {
  try {
    return await jsBridge.nativeASR.isAvailable();
  } catch {
    return false;
  }
}

// ------ 主检测函数 ------

/**
 * 检测当前环境可用的语音能力，返回按优先级排序的级别数组。
 * TTS 已迁移为 MiMo > Web；ASR 在下一阶段完成 MiMo 迁移。
 */
export async function detect(): Promise<VoiceCapabilities> {
  const nativeASR = await isNativeASRAvailable();

  const tts: VoiceLevel[] = ['mimo'];
  if (isWebTTSAvailable()) tts.push('web');

  const asr: VoiceLevel[] = [];
  if (isWebASRAvailable()) asr.push('web');
  if (nativeASR) asr.push('native');
  asr.push('doubao'); // 服务端 API，始终可用

  return { tts, asr };
}
