/**
 * @deprecated 迁移兼容层。新代码直接使用 `mimo.ts`。
 */
import {
  MimoError,
  synthesizeSpeech,
  transcribeSpeech,
  type MimoAudioFormat,
} from './mimo';

export { synthesizeSpeech, transcribeSpeech };

/** @deprecated 使用 `synthesizeSpeech`。 */
export async function textToSpeech(
  text: string,
  _legacySpeed?: number,
): Promise<Uint8Array> {
  return (await synthesizeSpeech(text)).bytes;
}

/** @deprecated 使用 `transcribeSpeech`。 */
export async function transcribeFile(
  audioData: Uint8Array,
  audioFormat: string,
): Promise<string> {
  if (audioFormat !== 'wav' && audioFormat !== 'mp3') {
    throw new MimoError('语音文件格式无效', 'schema', 400);
  }
  return transcribeSpeech(audioData, audioFormat as MimoAudioFormat);
}
