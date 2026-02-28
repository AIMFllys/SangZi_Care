// ============================================================
// 桑梓智护 — 语音能力检测
// 检测 Web Speech API / Android Native / 豆包 API 三级可用性
// ============================================================

import { jsBridge } from '@/lib/jsbridge';

/** 语音能力级别 */
export type VoiceLevel = 'web' | 'native' | 'doubao';

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

async function isNativeTTSAvailable(): Promise<boolean> {
  try {
    return await jsBridge.nativeTTS.isAvailable();
  } catch {
    return false;
  }
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
 * 优先级：web > native > doubao（doubao 作为服务端 API 始终可用）
 */
export async function detect(): Promise<VoiceCapabilities> {
  const [nativeTTS, nativeASR] = await Promise.all([
    isNativeTTSAvailable(),
    isNativeASRAvailable(),
  ]);

  const tts: VoiceLevel[] = [];
  if (isWebTTSAvailable()) tts.push('web');
  if (nativeTTS) tts.push('native');
  tts.push('doubao'); // 服务端 API，始终可用

  const asr: VoiceLevel[] = [];
  if (isWebASRAvailable()) asr.push('web');
  if (nativeASR) asr.push('native');
  asr.push('doubao'); // 服务端 API，始终可用

  return { tts, asr };
}
