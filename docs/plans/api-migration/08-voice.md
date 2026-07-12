# 08 — Voice TTS / ASR

> Status: planned · 依赖 00、[07-ai](./07-ai.md)（可弱依赖，仅共享 env 习惯）

## 1. 背景与对照

对照 [`backend/api/v1/ai_voice.py`](../../../backend/api/v1/ai_voice.py)、[`backend/services/voice_service.py`](../../../backend/services/voice_service.py)。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| POST | `/api/v1/voice/tts` | Bearer | text → audio/mpeg 流 |
| POST | `/api/v1/voice/transcribe` | Bearer | multipart 音频 → text |

**WebSocket** `/api/v1/voice/stream-asr`：二期；首版可 501 或省略。

首版允许与 Python 相同的**占位实现**（静音帧 / 固定文案），但契约（状态码、Content-Type、JSON 字段）必须稳定，便于前端与后续换真火山。

## 3. 文件落点

```
app/api/v1/voice/tts/route.ts
app/api/v1/voice/transcribe/route.ts
lib/server/voice.ts
```

## 4. 环境变量

`VOLCANO_APP_ID`、`VOLCANO_ACCESS_TOKEN` 等（真接入时用）。

## 5. 验收步骤

1. POST tts 返回 `audio/mpeg`。
2. POST transcribe 返回 `{ text: string }` 形（字段名对照前端）。
3. 未配置密钥时不崩溃。

## 6. 风险与非目标

- **非目标**：不修 JSBridge；不改健康录入页 ASR 三级降级逻辑以外的 UI。

## 7. Devin

可选：健康录入页点语音（若浏览器允许麦克风）；否则跳过，以 curl 契约为准。
