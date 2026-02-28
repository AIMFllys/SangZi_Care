// ============================================================
// 桑梓智护 — 语音状态管理 (Zustand 5)
// 缓存语音能力检测结果，管理当前 ASR/TTS 级别与降级
// ============================================================

import { create } from 'zustand';
import { detect, type VoiceLevel } from '@/lib/voiceCapabilities';

export interface VoiceState {
  /** 可用 TTS 级别（按优先级排序） */
  ttsLevels: VoiceLevel[];
  /** 可用 ASR 级别（按优先级排序） */
  asrLevels: VoiceLevel[];
  /** 当前使用的 TTS 级别 */
  currentTTSLevel: VoiceLevel;
  /** 当前使用的 ASR 级别 */
  currentASRLevel: VoiceLevel;
  /** 是否已完成能力检测 */
  isDetected: boolean;

  /** 执行能力检测并缓存结果 */
  detect: () => Promise<void>;
  /** TTS 降级到下一可用级别，返回是否成功 */
  fallbackTTS: () => boolean;
  /** ASR 降级到下一可用级别，返回是否成功 */
  fallbackASR: () => boolean;
}

export const useVoiceStore = create<VoiceState>()((set, get) => ({
  ttsLevels: ['doubao'],
  asrLevels: ['doubao'],
  currentTTSLevel: 'doubao',
  currentASRLevel: 'doubao',
  isDetected: false,

  detect: async () => {
    const { isDetected } = get();
    if (isDetected) return; // 避免重复检测

    const capabilities = await detect();

    set({
      ttsLevels: capabilities.tts,
      asrLevels: capabilities.asr,
      currentTTSLevel: capabilities.tts[0],
      currentASRLevel: capabilities.asr[0],
      isDetected: true,
    });
  },

  fallbackTTS: () => {
    const { ttsLevels, currentTTSLevel } = get();
    const currentIndex = ttsLevels.indexOf(currentTTSLevel);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= ttsLevels.length) return false; // 已无更多级别

    set({ currentTTSLevel: ttsLevels[nextIndex] });
    return true;
  },

  fallbackASR: () => {
    const { asrLevels, currentASRLevel } = get();
    const currentIndex = asrLevels.indexOf(currentASRLevel);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= asrLevels.length) return false; // 已无更多级别

    set({ currentASRLevel: asrLevels[nextIndex] });
    return true;
  },
}));
