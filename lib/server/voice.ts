// ============================================================
// 桑梓智护 · 火山引擎语音服务端调用（TTS / ASR）
// ------------------------------------------------------------
// 对齐 backend/services/voice_service.py：
//   - textToSpeech:        文本 → MP3 音频字节
//   - transcribeFile:      音频文件 → 文本
//   - 未配置 Key 时降级为占位实现，不抛 500（对齐 Python _is_configured 分支
//     与 doubao.ts 模式）
//   - 流式 ASR（stream_asr）为二期，本文件不实现
//
// 密钥安全：本文件仅在服务端 Route Handler 内 import；
//   VOLCANO_* 密钥不加 NEXT_PUBLIC_ 前缀，绝不进客户端产物。
// ============================================================

/** 火山引擎语音服务配置（服务端 env 读取）。 */
interface VoiceConfig {
  appId: string;
  accessToken: string;
  ttsResourceId: string;
  asrStreamResourceId: string;
  ttsWsUrl: string;
  asrWsUrl: string;
}

function readConfig(): VoiceConfig {
  return {
    appId: (process.env.VOLCANO_APP_ID ?? '').trim(),
    accessToken: (process.env.VOLCANO_ACCESS_TOKEN ?? '').trim(),
    ttsResourceId: (process.env.VOLCANO_TTS_RESOURCE_ID ?? '').trim(),
    asrStreamResourceId: (
      process.env.VOLCANO_ASR_STREAM_RESOURCE_ID ?? ''
    ).trim(),
    ttsWsUrl: (
      process.env.VOLCANO_TTS_WS_URL ??
      'wss://openspeech.bytedance.com/api/v1/tts/ws'
    ).trim(),
    asrWsUrl: (
      process.env.VOLCANO_ASR_WS_URL ??
      'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel'
    ).trim(),
  };
}

function isConfigured(cfg: VoiceConfig): boolean {
  return cfg.appId !== '' && cfg.accessToken !== '';
}

/**
 * 生成最小静音 MP3 帧（占位音频）。
 * 对齐 Python VoiceService._generate_placeholder_audio：
 *   MPEG1 Layer3 128kbps 44100Hz stereo，header 0xFF 0xFB 0x90 0x00
 *   + 413 字节 0x00 填充，共 417 字节。
 */
function generatePlaceholderAudio(): Uint8Array {
  const frame = new Uint8Array(417);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x00;
  // 余下 413 字节默认为 0x00，无需显式填充
  return frame;
}

/**
 * 文本转语音（TTS）。
 *
 * 未配置火山引擎密钥时，降级返回最小静音 MP3 帧，不抛错。
 * 真接入时此处应 POST `ttsWsUrl`，带 app_id / access_token / text /
 * speed / voice_type 等参数，回传 MP3 字节流。
 *
 * @param text  待合成文本（由路由层校验长度 1-5000）
 * @param speed 语速倍率 0.5-2.0，默认 1.0
 * @returns     MP3 音频字节（占位实现为 417 字节静音帧）
 */
export async function textToSpeech(
  text: string,
  speed = 1.0,
): Promise<Uint8Array> {
  const cfg = readConfig();
  if (!isConfigured(cfg)) {
    console.warn(
      '[voice] TTS 未配置（缺少 VOLCANO_APP_ID 或 VOLCANO_ACCESS_TOKEN），返回占位静音帧。',
    );
    return generatePlaceholderAudio();
  }

  // 真接入路径（占位实现暂不调用）：
  //   1. 建立 WebSocket 连接到 cfg.ttsWsUrl
  //   2. 发送 { app, user, audio, request } payload（含 text/speed/voice_type）
  //   3. 接收二进制 MP3 分片并拼接
  //   4. 返回完整 MP3 字节
  //
  // 当前直接返回占位音频，保证契约稳定。
  console.info(
    '[voice] TTS request: text=%s speed=%.1f (placeholder)',
    text.slice(0, 50),
    speed,
  );
  return generatePlaceholderAudio();
}

/**
 * 录音文件转写（ASR）。
 *
 * 未配置火山引擎密钥时，降级返回固定占位文案，不抛错。
 * 真接入时此处应 POST 录音文件识别 2.0 接口并轮询/回调取结果。
 *
 * @param audioData   音频文件字节（由路由层校验非空）
 * @param audioFormat 音频格式扩展名（mp3/wav/pcm/webm/ogg）
 * @returns           转写文本（占位实现为固定中文文案）
 */
export async function transcribeFile(
  audioData: Uint8Array,
  audioFormat: string,
): Promise<string> {
  const cfg = readConfig();
  if (!isConfigured(cfg)) {
    console.warn(
      '[voice] ASR 未配置（缺少 VOLCANO_APP_ID 或 VOLCANO_ACCESS_TOKEN），返回占位文案。',
    );
    return '这是语音转写的占位文本';
  }

  // 真接入路径（占位实现暂不调用）：
  //   1. POST 音频到火山引擎录音文件识别 2.0 接口
  //   2. 轮询或回调获取转写结果
  //   3. 返回转写文本
  //
  // 当前直接返回占位文案，保证契约稳定。
  console.info(
    '[voice] ASR file transcription: format=%s size=%d bytes (placeholder)',
    audioFormat,
    audioData.byteLength,
  );
  return '这是语音转写的占位文本';
}
