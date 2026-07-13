# Xiaomi MiMo Voice Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all placeholder/Web-first speech paths with authenticated Xiaomi MiMo V2.5 ASR/TTS and wire real voice behavior into the assistant, health input, chat, medicine, and radio flows.

**Architecture:** A small server-only MiMo client owns protocol, timeouts, retries, response validation, and safe logging. It follows the official MiMo contract with `api-key` authentication, non-streaming MP3 TTS, and the explicit Chinese `冰糖` preset voice. Browsers capture mono PCM and encode WAV before uploading to same-origin authenticated routes. Hooks expose explicit recording/transcribing/speaking states and abortable async contracts; consumer pages never treat placeholders or unfinished uploads as success.

**Tech Stack:** Next.js Route Handlers, TypeScript, Web Audio API, Zustand, native `fetch`, Vitest/Testing Library, Xiaomi MiMo `/v1/chat/completions`.

---

## File map

**Create**

- `lib/server/mimo.ts` — configuration, request client, error mapping, TTS/ASR response validation.
- `lib/server/__tests__/mimo.test.ts` — deterministic protocol tests.
- `lib/server/__tests__/mimo.live.test.ts` — opt-in paid TTS→ASR smoke.
- `lib/audio/wav.ts` and `lib/audio/__tests__/wav.test.ts` — PCM WAV encoding and header validation.
- `lib/audio/recorder.ts` — abortable browser PCM recorder.
- `app/api/v1/voice/__tests__/tts.route.test.ts`
- `app/api/v1/voice/__tests__/transcribe.route.test.ts`
- `app/api/v1/voice/upload/route.ts`, `audio/route.ts`, and mocked-storage route tests.

**Modify**

- `.env.example` and `docs/ops/env-config.md` — add server-only MiMo variables while preserving Ark LLM variables.
- `lib/server/voice.ts` — temporary compatibility re-export, deleted in Task 7 after all imports move to `mimo.ts`.
- `app/api/v1/voice/{tts,transcribe}/route.ts` — strict boundaries.
- `lib/voiceCapabilities.ts`, `stores/voiceStore.ts`, and tests — `mimo` primary; remove broken Native path.
- `hooks/useVoiceRecognition.ts`, `hooks/useTextToSpeech.ts`, and tests — abortable real calls.
- `/voice`, health input, chat/VoiceRecorder, medicine reminder, radio, and related stores/routes/tests.
- `lib/jsbridge.ts` and tests — remove Native ASR/TTS assumptions; Android bridge is handled in the Android plan.

## Task 1: Implement the server-only MiMo protocol client

**Files:**

- Create: `lib/server/mimo.ts`
- Create: `lib/server/__tests__/mimo.test.ts`
- Modify: `.env.example`
- Modify: `docs/ops/env-config.md`
- Modify: `lib/server/index.ts`

- [ ] **Step 1: Write failing configuration and payload tests**

Mock global `fetch`. Cover:

```ts
it('sends TTS target text as an assistant message', async () => {
  process.env.MIMO_API_KEY = 'test-key';
  fetchMock.mockResolvedValue(jsonResponse({
    choices: [{ message: { audio: { data: Buffer.from([0xff, 0xfb, 0x90, 0x00]).toString('base64') } } }],
  }));
  await synthesizeSpeech('现在该吃药了。', { voice: '冰糖' });
  const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  expect(body.model).toBe('mimo-v2.5-tts');
  expect(body.messages.at(-1)).toEqual({ role: 'assistant', content: '现在该吃药了。' });
  expect(body.audio).toEqual({ format: 'mp3', voice: '冰糖' });
  expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ 'api-key': 'test-key' });
});

it('sends WAV as an input_audio data URL', async () => {
  await transcribeSpeech(new Uint8Array([0x52, 0x49, 0x46, 0x46]), 'wav');
  const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  expect(body.model).toBe('mimo-v2.5-asr');
  expect(body.messages[0].role).toBe('user');
  expect(body.messages[0].content).toHaveLength(1);
  expect(body.messages[0].content[0].type).toBe('input_audio');
  expect(body.messages[0].content[0].input_audio.data).toMatch(/^data:audio\/wav;base64,/);
  expect(body.asr_options).toEqual({ language: 'zh' });
});
```

Also test missing key, malformed choices, invalid Base64, empty/no-speech transcript, 400/401/402/403/404/421 no retry, 429/500/503 finite retry, and AbortError timeout. Cover an MP3 ASR data URL with `data:audio/mpeg;base64,`.

- [ ] **Step 2: Run and verify the missing module failure**

Run: `npx vitest run lib/server/__tests__/mimo.test.ts`

Expected: FAIL because `lib/server/mimo.ts` does not exist.

- [ ] **Step 3: Implement typed config and errors**

```ts
const DEFAULT_BASE_URL = 'https://api.xiaomimimo.com/v1';
const DEFAULT_TIMEOUT_MS = 45_000;

export class MimoError extends Error {
  constructor(
    message: string,
    readonly kind: 'config' | 'auth' | 'payment_required' | 'forbidden' | 'content_filter' | 'rate_limit' | 'upstream' | 'timeout' | 'schema' | 'no_speech',
    readonly status: number,
  ) { super(message); }
}

function getConfig() {
  const apiKey = process.env.MIMO_API_KEY?.trim();
  if (!apiKey) throw new MimoError('MiMo 语音服务未配置', 'config', 503);
  return {
    apiKey,
    baseUrl: (process.env.MIMO_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ''),
    ttsModel: process.env.MIMO_TTS_MODEL ?? 'mimo-v2.5-tts',
    asrModel: process.env.MIMO_ASR_MODEL ?? 'mimo-v2.5-asr',
    voice: process.env.MIMO_TTS_VOICE ?? '冰糖',
  };
}
```

- [ ] **Step 4: Implement one request function with bounded retry**

Use the official `api-key: ${apiKey}` header, JSON body, a per-attempt AbortController, and no text/audio/key logging. Retry only network errors, 429, 500, and 503, at most two additional attempts with short jittered backoff. Map 402 to `payment_required`, 403 to the deliberately generic `forbidden` (the same status covers region and risk-control failures), and 421 to `content_filter`; none of 400/401/402/403/404/421 may retry.

- [ ] **Step 5: Implement strict TTS and ASR parsers**

- TTS reads `choices[0].message.audio.data`, validates Base64 plus an MP3 frame/ID3 header, and returns `{ bytes, contentType: 'audio/mpeg' }`.
- ASR reads `choices[0].message.content`, trims it, and maps empty text to the retryable business result `no_speech` rather than a schema violation.
- `transcribeSpeech` accepts only `'wav' | 'mp3'`.
- Validate `MIMO_TTS_VOICE` against the official built-in list: `mimo_default`, `冰糖`, `茉莉`, `苏打`, `白桦`, `Mia`, `Chloe`, `Milo`, `Dean`.

- [ ] **Step 6: Document env names without secrets**

Append to `.env.example`:

```dotenv
# --- Xiaomi MiMo 语音（仅服务端）---
MIMO_API_KEY=
# MIMO_API_BASE_URL=https://api.xiaomimimo.com/v1
# MIMO_TTS_MODEL=mimo-v2.5-tts
# MIMO_ASR_MODEL=mimo-v2.5-asr
# MIMO_TTS_VOICE=冰糖
```

Do not delete `VOLCANO_ARK_API_KEY`, `VOLCANO_ARK_BASE_URL`, or `VOLCANO_ARK_MODEL_ENDPOINT` because current AI chat still uses them. Document that `MIMO_API_BASE_URL` and the API key must be copied as a region/billing pair from the same MiMo console; regional endpoints and keys are not interchangeable.

- [ ] **Step 7: Run deterministic tests and typecheck**

Run: `npx vitest run lib/server/__tests__/mimo.test.ts && npm run tsc`

Expected: all tests PASS; no live network request occurs.

- [ ] **Step 8: Commit the MiMo client**

```powershell
git add .env.example docs/ops/env-config.md lib/server/mimo.ts lib/server/index.ts lib/server/__tests__/mimo.test.ts
git commit -m "feat(voice): add Xiaomi MiMo server client"
```

## Task 2: Make TTS and transcription routes strict and observable

**Files:**

- Create: `app/api/v1/voice/__tests__/tts.route.test.ts`
- Create: `app/api/v1/voice/__tests__/transcribe.route.test.ts`
- Modify: `app/api/v1/voice/tts/route.ts`
- Modify: `app/api/v1/voice/transcribe/route.ts`
- Delete after compatibility imports are removed: `lib/server/voice.ts`

- [ ] **Step 1: Write failing TTS route tests**

Cover unauthenticated 401, non-JSON 400, empty text 400, 1001 Unicode characters 400, speed outside 0.5–2.0, missing key 503, and successful MP3 response with `Cache-Control: private, no-store`. Accept `speed` temporarily for compatibility but never send it to MiMo; Task 5 moves the preference entirely to `HTMLAudioElement.playbackRate` and stops sending it.

```ts
expect(response.headers.get('content-type')).toBe('audio/mpeg');
expect(response.headers.get('cache-control')).toContain('no-store');
expect(new Uint8Array(await response.arrayBuffer())).toEqual(expectedAudio);
```

- [ ] **Step 2: Write failing transcription route tests**

Cover authentication, multipart requirement, missing file, empty file, >5MB, WebM rejection, fake WAV header rejection, valid RIFF/WAVE, valid MP3 ID3/frame, and successful `{ text }`.

- [ ] **Step 3: Run route tests and verify placeholder behavior fails expectations**

Run: `npx vitest run app/api/v1/voice/__tests__`

Expected: FAIL because current routes accept WebM/OGG/octet-stream, allow 5000 TTS characters, and turn config absence into fake success.

- [ ] **Step 4: Implement exact audio validation**

```ts
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

function detectAudioFormat(bytes: Uint8Array): 'wav' | 'mp3' | null {
  const wav = ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE';
  const mp3 = ascii(bytes, 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  return wav ? 'wav' : mp3 ? 'mp3' : null;
}
```

Reject MIME/header mismatch. Do not trust the filename extension.

The 5 MiB value is this application's raw-upload limit. MiMo's published limit applies to the Base64-encoded string (at most 10 MB); tests must prove a 5 MiB raw payload plus its data-URL prefix remains below that upstream bound. The 45-second upstream timeout and 60-second recording cap are also application/EdgeOne safeguards, not claimed MiMo service limits.

- [ ] **Step 5: Map `MimoError` to safe HTTP responses**

Map `config` to 503, `auth` to 502, `payment_required` to 503, `forbidden` to 502, `content_filter` to 422, `rate_limit` to 429, `upstream` to 502, `timeout` to 504, `schema` to 502, and `no_speech` to 422. Add `X-Request-Id` generated per route. Logs contain request ID, status, elapsed milliseconds, input bytes or text length only.

- [ ] **Step 6: Remove placeholder audio/text**

Delete `generatePlaceholderAudio` and fixed transcription strings. In this task, replace `lib/server/voice.ts` with compatibility re-exports of `synthesizeSpeech` and `transcribeSpeech`; Task 7 migrates the final imports and deletes the file.

- [ ] **Step 7: Verify route tests, lint, and typecheck**

Run: `npx vitest run app/api/v1/voice/__tests__ lib/server/__tests__/mimo.test.ts && npm run lint && npm run tsc`

Expected: exit 0.

- [ ] **Step 8: Commit the route boundary**

```powershell
git add app/api/v1/voice lib/server/voice.ts
git commit -m "feat(voice): validate MiMo speech routes"
```

## Task 3: Encode browser microphone audio as PCM WAV

**Files:**

- Create: `lib/audio/wav.ts`
- Create: `lib/audio/__tests__/wav.test.ts`
- Create: `lib/audio/recorder.ts`
- Create: `lib/audio/__tests__/recorder.test.ts`

- [ ] **Step 1: Write a failing WAV header test**

```ts
const wav = encodePcm16Wav(new Float32Array([0, 0.5, -0.5]), 16_000, 1);
const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
expect(new TextDecoder().decode(wav.slice(0, 4))).toBe('RIFF');
expect(new TextDecoder().decode(wav.slice(8, 12))).toBe('WAVE');
expect(view.getUint16(22, true)).toBe(1);
expect(view.getUint32(24, true)).toBe(16_000);
expect(view.getUint16(34, true)).toBe(16);
expect(view.getUint32(40, true)).toBe(6);
```

- [ ] **Step 2: Run and verify missing encoder failure**

Run: `npx vitest run lib/audio/__tests__/wav.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement a clamped little-endian encoder**

Write the 44-byte RIFF/WAVE header, clamp samples to [-1,1], and write signed PCM16LE. Keep the function pure and dependency-free.

- [ ] **Step 4: Write recorder lifecycle tests**

Mock `getUserMedia`, `AudioContext`, source/processor nodes, and tracks. Assert start, duration limit, stop, abort, track cleanup, and output Blob type `audio/wav`.

- [ ] **Step 5: Implement `PcmWavRecorder`**

The public contract is:

```ts
export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  sampleRate: number;
}

export interface VoiceRecorderSession {
  stop(): Promise<RecordingResult>;
  abort(): void;
}

export async function startPcmWavRecording(options: {
  maxDurationMs: number;
  signal?: AbortSignal;
}): Promise<VoiceRecorderSession>;
```

Capture mono samples, downmix additional channels, stop at the hard application duration limit of 60 seconds, and always close AudioContext/stop tracks. This is an app UX/cost limit, not a published MiMo duration limit; at 16 kHz PCM16 mono it stays comfortably below the upload budget.

- [ ] **Step 6: Verify encoder and recorder tests**

Run: `npx vitest run lib/audio && npm run tsc`

Expected: PASS; no MediaRecorder/WebM usage remains in the new recorder.

- [ ] **Step 7: Commit browser WAV capture**

```powershell
git add lib/audio
git commit -m "feat(voice): record browser audio as PCM WAV"
```

## Task 4: Add shared authenticated transports and make MiMo TTS primary

This task deliberately migrates TTS before narrowing `VoiceLevel`. The old ASR hook still needs the legacy union until Task 5; changing the union and deleting Native bridge speech in an earlier commit would make `useTextToSpeech.ts`, its tests, and the full TypeScript build fail.

**Files:**

- Modify: `lib/api.ts`
- Create: `lib/__tests__/api.test.ts`
- Modify: `lib/voiceCapabilities.ts`
- Modify: `lib/__tests__/voiceCapabilities.test.ts`
- Modify: `stores/voiceStore.ts`
- Modify: `stores/__tests__/voiceStore.test.ts`
- Modify: `hooks/useTextToSpeech.ts`
- Modify: `hooks/__tests__/useTextToSpeech.test.ts`
- Inspect and use without adding a second preference field: `stores/userStore.ts`

- [ ] **Step 1: Write failing authenticated transport tests**

Test `fetchFormData<T>()` and `fetchBlob()` through the real exported helpers. Cover bearer injection, no manually supplied multipart `Content-Type`, one 401 refresh and retry with the new token, two concurrent 401 responses sharing one refresh, non-JSON errors, `ApiError.status`, and caller `AbortSignal` during the first request and retry. The intended API is:

```ts
export class ApiError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message);
    this.name = 'ApiError';
  }
}

export function fetchFormData<T>(
  path: string,
  formData: FormData,
  options?: { method?: 'POST' | 'PATCH'; signal?: AbortSignal },
): Promise<T>;

export function fetchBlob(
  path: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
): Promise<Blob>;
```

- [ ] **Step 2: Write failing MiMo TTS lifecycle tests**

Replace tests for Native/doubao-first behavior. Cover all of the following:

- MiMo is requested even when `speechSynthesis` exists; the JSON body is exactly `{ text }`, with no upstream `speed` field.
- `user.voice_speed` is used when finite, otherwise Elder/Family defaults are used, and every value is clamped to 0.5–2 before assigning `audio.playbackRate`.
- stopping during fetch aborts once and is an intentional cancellation, not a visible error;
- stopping during playback pauses, detaches handlers, revokes the Blob URL exactly once, and settles the pending `speak()` promise;
- starting a new `speak()` cancels the old operation without letting old completion set the new operation's state;
- unmount performs the same idempotent cleanup;
- text is split by Unicode code point into at most 1000-character chunks, preferring `。！？；\n`, hard-splitting unpunctuated text, never sending an empty chunk, and playing chunks serially;
- a real MiMo/network/playback failure sets a Chinese error; Web Speech may receive the same text only as an explicit TTS fallback, never as the initial path.

- [ ] **Step 3: Run the focused tests and verify old behavior fails**

Run:

```powershell
npx vitest run lib/__tests__/api.test.ts hooks/__tests__/useTextToSpeech.test.ts lib/__tests__/voiceCapabilities.test.ts stores/__tests__/voiceStore.test.ts
```

Expected: FAIL because binary/form-data helpers do not exist, TTS is Web/Native-first, it sends `speed`, and cancellation/chunking are missing.

- [ ] **Step 4: Refactor one low-level authenticated request path**

Have `fetchApi`, `fetchFormData`, and `fetchBlob` call one internal response function. Preserve `fetchApi`'s existing `skipAuth`, JSON, and 204 contracts. The internal path injects the current bearer token, shares the existing module-level refresh promise, retries a 401 only once, preserves the caller signal, and constructs fresh headers for retry. A caller that aborts while awaiting the shared refresh must stop waiting without aborting the refresh used by other requests. Wrap network failures as `ApiError` with `status: null`, but preserve `AbortError` for intentional cancellation. `fetchFormData` must let the browser create the multipart boundary. Parse safe error messages without assuming JSON. Do not expose response bodies or tokens in logs.

- [ ] **Step 5: Make TTS capability order MiMo-first without breaking legacy ASR**

Temporarily extend the union to `type VoiceLevel = 'mimo' | 'web' | 'native' | 'doubao'`. TTS detection returns `['mimo', 'web']` when Web Speech exists and `['mimo']` otherwise. ASR retains its old values only until Task 5. Initialize the TTS store at `mimo`; update tests to make this transitional boundary explicit.

- [ ] **Step 6: Implement the seek-safe MiMo audio lifecycle**

Use one operation token, one `AbortController`, one current `HTMLAudioElement`, and one idempotent cleanup routine. `stop()` and superseding `speak()` resolve intentional cancellation, remove event handlers before pause/revoke, and prevent stale operations from changing new state. Read the persisted selector directly with `useUserStore((state) => state.user?.voice_speed)`; do not add another preference source.

- [ ] **Step 7: Verify the TTS/transport boundary**

Run:

```powershell
npx vitest run lib/__tests__/api.test.ts hooks/__tests__/useTextToSpeech.test.ts lib/__tests__/voiceCapabilities.test.ts stores/__tests__/voiceStore.test.ts
npm run tsc
npm run lint -- --quiet
```

Expected: PASS; active TTS code contains no Native call, no `doubao` branch, and no numeric speed in the route request body.

- [ ] **Step 8: Commit authenticated transport and MiMo TTS**

```powershell
git add lib/api.ts lib/__tests__/api.test.ts lib/voiceCapabilities.ts lib/__tests__/voiceCapabilities.test.ts stores/voiceStore.ts stores/__tests__/voiceStore.test.ts hooks/useTextToSpeech.ts hooks/__tests__/useTextToSpeech.test.ts
git commit -m "feat(voice): play MiMo speech with user preferences"
```

## Task 5: Make MiMo the primary ASR path with an awaitable stop contract

**Files:**

- Modify: `lib/voiceCapabilities.ts`
- Modify: `lib/__tests__/voiceCapabilities.test.ts`
- Modify: `stores/voiceStore.ts`
- Modify: `stores/__tests__/voiceStore.test.ts`
- Modify: `hooks/useVoiceRecognition.ts`
- Modify: `hooks/__tests__/useVoiceRecognition.test.ts`
- Modify: `lib/jsbridge.ts`
- Modify: `lib/__tests__/jsbridge.test.ts`

- [ ] **Step 1: Write the final capability and bridge tests**

Narrow the final public union to `type VoiceLevel = 'mimo' | 'web'`. For authenticated online use, ASR and TTS both order MiMo first and include Web only when the corresponding browser API exists. Delete Native ASR/TTS types, methods, callback tests, and `doubao` VoiceLevel expectations. Keep phone/storage bridge behavior compiling until the Android plan removes the JavaScript interface itself.

- [ ] **Step 2: Write failing ASR state-machine tests**

The public contract is:

```ts
export type RecognitionPhase =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'transcribing'
  | 'success'
  | 'error';

export type StopResult = {
  transcript: string;
  audioBlob: Blob;
  durationMs: number;
};

startListening(): Promise<void>;
stopListening(): Promise<StopResult | null>;
cancelListening(): void;
```

`stopListening` itself must not be declared `async`; it returns a cached promise so concurrent callers receive the same object. Test permission → recording → transcribing → success, `recording.wav` with `audio/wav`, exactly one recorder stop/upload/transcript write, idle stop returning `null`, cancel during permission/recording/transcribing, 401 refresh through `fetchFormData`, unmount abort, stale-operation isolation, no-speech handling, and the hook's 60-second automatic stop.

- [ ] **Step 3: Lock the only feasible Web ASR fallback semantics**

Web Speech cannot transcribe an already captured WAV. Therefore a retryable MiMo network/429/5xx failure must:

1. reject the current stop with an actionable Chinese retry message and never fabricate a transcript;
2. select `web` only for the next explicit recording attempt;
3. leave permission denial, 400/401-after-refresh, and 422/no-speech as direct errors without fallback.

When the next attempt uses Web Speech, capture PCM WAV in parallel so a successful `StopResult` still contains a real audio Blob and duration. Tests must prove no Web recognition starts retroactively during the failed MiMo stop.

- [ ] **Step 4: Run tests and verify the old synchronous WebM path fails**

Run:

```powershell
npx vitest run hooks/__tests__/useVoiceRecognition.test.ts lib/__tests__/voiceCapabilities.test.ts stores/__tests__/voiceStore.test.ts lib/__tests__/jsbridge.test.ts
```

Expected: FAIL because the current hook returns synchronously, uploads WebM, calls Native speech, and has no explicit phases or cancellation result.

- [ ] **Step 5: Implement MiMo and next-attempt Web recording paths**

Always acquire audio through `startPcmWavRecording({ maxDurationMs: 60_000, signal })`. MiMo stop awaits the WAV result, uploads it with `fetchFormData`, trims exactly one final transcript, and returns the WAV/duration. The Web path runs browser recognition and the same PCM recorder concurrently, then waits for a final transcript plus WAV. A hook timer invokes the same cached stop operation at 60 seconds so the UI cannot remain in `recording` after the recorder auto-stops.

- [ ] **Step 6: Remove Native and WebM runtime paths**

Delete `MediaRecorder`, WebM/Opus, Native ASR/TTS bridge methods, and direct token/fetch duplication. Do not delete Ark/doubao text-AI modules: only `VoiceLevel` and speech runtime terminology change here.

- [ ] **Step 7: Verify the final hook/store/capability boundary**

Run:

```powershell
npx vitest run hooks/__tests__/useVoiceRecognition.test.ts hooks/__tests__/useTextToSpeech.test.ts lib/__tests__/api.test.ts stores/__tests__/voiceStore.test.ts lib/__tests__/voiceCapabilities.test.ts lib/__tests__/jsbridge.test.ts
npm run tsc
npm run lint -- --quiet
```

Expected: PASS; searches find no `MediaRecorder`, `recording.webm`, `nativeASR`, `nativeTTS`, or `VoiceLevel` value `doubao` in active speech code.

- [ ] **Step 8: Commit primary MiMo ASR**

```powershell
git add lib/voiceCapabilities.ts lib/__tests__/voiceCapabilities.test.ts stores/voiceStore.ts stores/__tests__/voiceStore.test.ts hooks/useVoiceRecognition.ts hooks/__tests__/useVoiceRecognition.test.ts lib/jsbridge.ts lib/__tests__/jsbridge.test.ts
git commit -m "feat(voice): make MiMo primary speech recognition"
```

## Task 6: Replace the `/voice` mock with a real conversation state machine

**Files:**

- Modify: `app/voice/page.tsx`
- Modify: `app/voice/page.module.css`
- Create or modify: `app/voice/__tests__/page.test.tsx`
- Modify: `hooks/useAIChat.ts` — return the assistant reply from `sendMessage` and expose `cancelPending()`.

- [ ] **Step 1: Write failing end-to-end component tests**

Mock recognition, AI chat, and TTS hooks. Assert:

1. start transitions idle → recording;
2. stop awaits transcription;
3. non-empty transcript is sent once to AI;
4. assistant reply is spoken once;
5. cancellation prevents send/speak;
6. each failure displays a retryable Chinese message;
7. the hard-coded “我想听京剧” timer never appears.

- [ ] **Step 2: Run and verify mock implementation fails**

Run: `npx vitest run app/voice/__tests__/page.test.tsx`

Expected: FAIL due to `setTimeout` recognition and non-awaitable AI/TTS orchestration.

- [ ] **Step 3: Implement explicit phases**

```ts
type VoiceConversationPhase =
  | 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'error';
```

Use a native `<button>` microphone. Disable only conflicting actions, not the entire page. End conversation calls recorder cancel, ASR cancel, `useAIChat.cancelPending()`, and TTS stop before navigation.

- [ ] **Step 4: Verify state-machine tests and interaction screenshot**

Expected: all phases render distinct status text; errors have retry; no timer or fake transcript remains.

- [ ] **Step 5: Commit the real assistant**

```powershell
git add app/voice hooks/useAIChat.ts
git commit -m "feat(voice): connect assistant to real ASR and TTS"
```

## Task 7: Wire health input, chat voice messages, medicine, and radio

**Files:**

- Modify: `app/health/input/page.tsx` and tests.
- Modify: `components/messages/VoiceRecorder.tsx`, `app/messages/[id]/ChatDetail.tsx`, `stores/messageStore.ts`, message API route(s), and tests.
- Modify: `components/medicine/ReminderModal.tsx` or actual inline reminder consumer and tests.
- Modify: `app/radio/page.tsx`, `stores/radioStore.ts`, `lib/server/broadcast.ts`, radio route(s), and tests.
- Create: `app/api/v1/voice/upload/route.ts` and `app/api/v1/voice/audio/route.ts` for private object upload and authenticated signed playback.

- [ ] **Step 1: Write failing consumer tests before changing behavior**

- Health: stopping voice awaits final transcript, parses values, and requires confirmation before save.
- Chat: successful voice send includes transcript, duration, and a non-empty private `audio_url`; failed upload does not append a fake voice message.
- Medicine: reminder speaks once, stop cancels, and component unmount cleans audio.
- Radio: play invokes a real audio URL; generation without storage cannot report success.

- [ ] **Step 2: Run consumer tests and verify failures**

Run: `npx vitest run app/health/input components/messages app/messages components/medicine app/radio stores/__tests__/radioStore.test.ts`

Expected: failures expose synchronous stop, empty `audio_url`, and inert radio/reminder behavior.

- [ ] **Step 3: Implement confirmed health voice input**

Show transcript, parsed record type/values, and editable confirmation. Never directly save an unconfirmed health interpretation.

- [ ] **Step 4: Implement private voice-message storage**

Use the existing Supabase server client and private bucket `SUPABASE_VOICE_BUCKET` (default `voice-audio`). Store under `userId/messages/randomUUID.wav`; persist that stable object path in the existing `audio_url` column. Message GET responses replace stored paths with 10-minute signed URLs, while the authenticated `/api/v1/voice/audio?path=` route validates path ownership before redirecting/streaming. Reject missing bucket configuration with a 503 response.

- [ ] **Step 5: Wire medicine and radio audio**

Medicine reuses `useTextToSpeech`. Broadcast generation uploads generated MP3 under `userId/broadcasts/randomUUID.mp3` and persists the object path in `audio_url`; radio GET responses sign it for 10 minutes. Radio play uses a real `<audio>` object/store state and exposes play/pause/error.

- [ ] **Step 6: Verify all consumer tests and route tests**

Run: `npx vitest run app/health/input components/messages app/messages components/medicine app/radio app/api/v1/messages app/api/v1/radio stores`

Expected: PASS; no consumer calls a placeholder or silently drops generated bytes.

- [ ] **Step 7: Commit the consumer integration**

```powershell
git add app/health/input components/messages app/messages stores/messageStore.ts components/medicine app/radio stores/radioStore.ts lib/server/broadcast.ts app/api/v1/messages app/api/v1/radio app/api/v1/voice/upload
git commit -m "feat(voice): connect voice across care workflows"
```

## Task 8: Add a paid real MiMo smoke test and production safeguards

**Files:**

- Create: `lib/server/__tests__/mimo.live.test.ts`
- Modify: `package.json`
- Modify: `docs/ops/env-config.md`
- Modify: `docs/详解/功能详解.md`

- [ ] **Step 1: Write the opt-in live test**

The test is skipped unless `RUN_MIMO_E2E === '1'` and `MIMO_API_KEY` is present. It synthesizes “今天记得按时吃药”, sends the returned MP3 to ASR, and expects the transcript to contain at least two of `今天`, `记得`, `按时`, `吃药`.

```ts
const live = process.env.RUN_MIMO_E2E === '1' ? it : it.skip;
live('round-trips fixed Chinese speech through TTS and ASR', async () => {
  const audio = await synthesizeSpeech('今天记得按时吃药');
  const text = await transcribeSpeech(audio.bytes, 'mp3');
  expect(['今天', '记得', '按时', '吃药'].filter((word) => text.includes(word)).length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2: Add exact scripts**

```json
{
  "test": "vitest run",
  "test:voice": "vitest run lib/server/__tests__/mimo.test.ts app/api/v1/voice hooks/__tests__/useVoiceRecognition.test.ts hooks/__tests__/useTextToSpeech.test.ts",
  "test:voice:live": "node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/server/__tests__/mimo.live.test.ts"
}
```

The operator sets `RUN_MIMO_E2E=1` for the paid run. Never echo the key.

- [ ] **Step 3: Configure local ignored env and verify Git safety**

Write the provided credential only to `.env.local` as `MIMO_API_KEY`. Run `git check-ignore -v .env.local` and `git grep` for the credential prefix; expected: env ignored and no tracked match.

- [ ] **Step 4: Run deterministic voice suite**

Run: `npm run test:voice`

Expected: PASS without external requests.

- [ ] **Step 5: Run the paid round-trip once**

PowerShell:

```powershell
$env:RUN_MIMO_E2E='1'
npm run test:voice:live
Remove-Item Env:RUN_MIMO_E2E
```

Expected: one live test PASS; output contains no API key, full audio, or personal text.

- [ ] **Step 6: Run the full web gate**

Run: `npm run lint && npm run tsc && npm test && npm run build`

Expected: all exit 0; `.next` build; no `output: 'export'`.

- [ ] **Step 7: Update live documentation and commit**

Document actual models, format limits, error behavior, storage requirements, and the opt-in smoke command. Mark the previous placeholder behavior removed.

```powershell
git add package.json package-lock.json lib/server/__tests__/mimo.live.test.ts docs/ops/env-config.md docs/详解/功能详解.md
git commit -m "test(voice): verify real MiMo speech round trip"
```
