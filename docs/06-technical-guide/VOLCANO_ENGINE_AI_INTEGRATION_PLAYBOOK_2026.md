# 火山引擎 AI 项目接入实战手册（UTF-8）

本文档用于代码层落地，目标是让你把火山引擎（豆包）能力稳定接入实际项目。

- 文档日期：2026-02-26
- 适用范围：Ark 通用模型 + 语音（TTS / Streaming ASR / Batch ASR / Realtime Voice）
- 安全原则：密钥仅放 `.env`，前端永不直连长期密钥

## 1. 最小可用配置

### 1.1 `.env`（仅服务端可读）

```bash
# Ark（通用大模型）
VOLCANO_ARK_API_KEY=
VOLCANO_ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCANO_ARK_MODEL=ep-xxxxxxxxxxxxxxxx

# 语音通用鉴权
VOLCANO_APP_ID=
VOLCANO_ACCESS_TOKEN=
VOLCANO_SECRET_KEY=

# 语音资源ID（实例ID）
VOLCANO_TTS_RESOURCE_ID=
VOLCANO_ASR_STREAM_RESOURCE_ID=
VOLCANO_ASR_BATCH_STANDARD_RESOURCE_ID=
VOLCANO_ASR_BATCH_FAST_RESOURCE_ID=
VOLCANO_ASR_BATCH_IDLE_RESOURCE_ID=
VOLCANO_REALTIME_VOICE_RESOURCE_ID=

# 可选：语音接口地址
VOLCANO_TTS_WS_URL=wss://openspeech.bytedance.com/api/v1/tts/ws
VOLCANO_ASR_WS_URL=wss://openspeech.bytedance.com/api/v2/asr
```

### 1.2 `.gitignore`

确保包含：

```gitignore
.env
.env.local
.env.*.local
```

## 2. 推荐架构（生产可用）

1. 前端 -> 你自己的后端 API（BFF）
2. 后端读取 `.env` 注入火山鉴权
3. 后端调用火山 API，前端只拿业务结果
4. 对流式语音使用 WebSocket 中转（可直接透传音频分片）

这样做的收益：

- 密钥不暴露
- 方便做限流、审计、计费归因
- 多模型可统一在后端切换

## 3. Ark（通用模型）接入

### 3.1 快速自测（curl）

```bash
curl --location "${VOLCANO_ARK_BASE_URL}/chat/completions" \
  --header "Authorization: Bearer ${VOLCANO_ARK_API_KEY}" \
  --header "Content-Type: application/json" \
  --data "{\
    \"model\": \"${VOLCANO_ARK_MODEL}\",\
    \"messages\": [\
      {\"role\":\"system\",\"content\":\"你是一个严谨的医疗助手。\"},\
      {\"role\":\"user\",\"content\":\"请给我3条高血压老人晨起注意事项。\"}\
    ],\
    \"temperature\": 0.3\
  }"
```

### 3.2 Node.js（OpenAI 兼容方式）

```ts
// server/ai/arkClient.ts
import OpenAI from "openai";

export const arkClient = new OpenAI({
  apiKey: process.env.VOLCANO_ARK_API_KEY!,
  baseURL: process.env.VOLCANO_ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
});

export async function chatWithArk(userText: string) {
  const resp = await arkClient.chat.completions.create({
    model: process.env.VOLCANO_ARK_MODEL!,
    temperature: 0.3,
    messages: [
      { role: "system", content: "你是一个严谨的健康助手，回答简洁且可执行。" },
      { role: "user", content: userText },
    ],
  });
  return resp.choices?.[0]?.message?.content || "";
}
```

```ts
// server/routes/ai.ts
import express from "express";
import { chatWithArk } from "../ai/arkClient";

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const text = String(req.body?.text || "");
    if (!text) return res.status(400).json({ error: "text is required" });
    const answer = await chatWithArk(text);
    res.json({ answer });
  } catch (err: any) {
    res.status(502).json({ error: "ark_upstream_error", detail: err?.message || "unknown" });
  }
});

export default router;
```

### 3.3 Python（FastAPI）

```python
# app/services/ark_service.py
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("VOLCANO_ARK_API_KEY"),
    base_url=os.getenv("VOLCANO_ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
)

def chat_with_ark(text: str) -> str:
    resp = client.chat.completions.create(
        model=os.getenv("VOLCANO_ARK_MODEL"),
        temperature=0.3,
        messages=[
            {"role": "system", "content": "你是严谨的健康助手。"},
            {"role": "user", "content": text},
        ],
    )
    return (resp.choices[0].message.content or "").strip()
```

## 4. TTS（语音合成）接入

### 4.1 接入流程

1. 前端上传文本到后端 `/api/voice/tts`
2. 后端按官方协议发起 TTS 请求（推荐 WebSocket）
3. 后端将音频流透传给前端播放，或落盘到对象存储后返回 URL

### 4.2 Node.js（WebSocket骨架）

```ts
// server/voice/ttsWs.ts
import crypto from "crypto";
import WebSocket from "ws";

type TtsChunkHandler = (audioChunk: Buffer) => void;

export function synthesizeTtsByWs(text: string, onChunk: TtsChunkHandler): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = process.env.VOLCANO_TTS_WS_URL || "wss://openspeech.bytedance.com/api/v1/tts/ws";
    const ws = new WebSocket(url);

    ws.on("open", () => {
      const req = {
        app: {
          appid: process.env.VOLCANO_APP_ID,
          token: process.env.VOLCANO_ACCESS_TOKEN,
          cluster: "volcano_tts",
        },
        user: { uid: "demo-user-001" },
        audio: { voice_type: "aria_v2", encoding: "mp3", speed_ratio: 1.0 },
        request: { reqid: crypto.randomUUID(), text, text_type: "plain" },
      };
      ws.send(JSON.stringify(req));
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(String(data));
      if (msg.audio) onChunk(Buffer.from(msg.audio, "base64"));
      if (msg.is_final) {
        ws.close();
        resolve();
      }
    });

    ws.on("error", reject);
    ws.on("close", () => resolve());
  });
}
```

## 5. Streaming ASR（流式识别）接入

### 5.1 接入流程

1. 前端每 20ms 切片 PCM/Opus 音频
2. 后端建立到火山 ASR 的 WS 会话
3. 后端转发音频分片并回传增量文本
4. 最终句结束后写入数据库（转写日志）

### 5.2 Node.js（网关透传骨架）

```ts
// server/voice/asrGateway.ts
import WebSocket, { WebSocketServer } from "ws";

export function mountAsrGateway(server: any) {
  const wss = new WebSocketServer({ server, path: "/ws/asr" });

  wss.on("connection", (clientWs) => {
    const upstream = new WebSocket(process.env.VOLCANO_ASR_WS_URL || "wss://openspeech.bytedance.com/api/v2/asr");

    upstream.on("open", () => {
      const startFrame = {
        appid: process.env.VOLCANO_APP_ID,
        token: process.env.VOLCANO_ACCESS_TOKEN,
        resource_id: process.env.VOLCANO_ASR_STREAM_RESOURCE_ID,
      };
      upstream.send(JSON.stringify(startFrame));
    });

    clientWs.on("message", (audioChunk) => {
      upstream.send(audioChunk);
    });

    upstream.on("message", (msg) => clientWs.send(msg));
    upstream.on("error", (e) => clientWs.send(JSON.stringify({ error: String(e) })));

    clientWs.on("close", () => upstream.close());
  });
}
```

## 6. Batch ASR（录音文件识别）接入

### 6.1 典型调用链路

1. 上传录音到对象存储（得到 URL）
2. 调用提交任务接口
3. 轮询任务状态或接收回调
4. 拉取最终转写结果

### 6.2 提交任务（curl模板）

```bash
curl -X POST "https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit" \
  -H "Content-Type: application/json" \
  -H "X-Api-Resource-Id: volc.seedasr.auc" \
  -d '{
    "appid": "'"${VOLCANO_APP_ID}"'",
    "token": "'"${VOLCANO_ACCESS_TOKEN}"'",
    "cluster": "volc_auc_common",
    "model_name": "doubao-asr-2.0",
    "audio_url": "https://your-bucket.example.com/audio/demo.wav",
    "enable_itn": true,
    "enable_speaker_diarization": true
  }'
```

说明：

- `resource_id/model_name/cluster` 以控制台和官方文档为准
- 建议在后端记录 `task_id` 和请求原文，便于问题排查

## 7. Realtime Voice（端到端语音大模型）接入

### 7.1 适用场景

- 语音问答
- 语音陪伴
- 低延时听-想-说闭环交互

### 7.2 推荐接法

1. 前端只连你自己的 `/ws/realtime-voice`
2. 后端再连火山实时语音模型
3. 双向透传音频帧与事件帧（session、tool、response）

### 7.3 关键工程点

- 会话级超时（如 60s 无输入自动关闭）
- 心跳保活（定时 ping）
- 断线重连（指数退避）
- 上下文裁剪（避免 token 持续膨胀）

## 8. 前端调用建议

### 8.1 文本对话

```ts
async function askAI(text: string) {
  const r = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(`chat failed: ${r.status}`);
  return (await r.json()) as { answer: string };
}
```

### 8.2 语音识别

- 浏览器采集音频（MediaRecorder/AudioWorklet）
- 每 20ms 发送二进制 chunk 到 `/ws/asr`
- 渲染服务端返回的增量文本与最终文本

## 9. 错误码与重试策略

1. `401/403`：鉴权失败，优先检查 Token 是否过期、签名字段是否完整
2. `429`：触发限流，做指数退避（1s/2s/4s）+ 熔断
3. `5xx`：上游异常，重试不超过 2 次并记录 traceId
4. WebSocket 中断：自动重连并提示“正在恢复语音连接”

## 10. 上线前检查清单

1. `.env` 未提交到仓库
2. 文档/日志无明文密钥
3. 后端接口有鉴权（JWT/Session）
4. 对话与语音请求有限流
5. API 调用有统一日志（requestId、latency、status）
6. 已配置密钥轮换流程

## 11. 官方文档（建议固定阅读）

- Ark API Key 配置  
  https://www.volcengine.com/docs/82379/1263279
- Ark Base URL 与鉴权  
  https://www.volcengine.com/docs/82379/1298459
- Ark 临时 API Key（GetApiKey）  
  https://www.volcengine.com/docs/82379/1262825
- Ark OpenAI 兼容调用  
  https://www.volcengine.com/docs/82379/1330626
- 音频技术 WebSocket API  
  https://www.volcengine.com/docs/6489/80993
- 豆包语音鉴权方法  
  https://www.volcengine.com/docs/6561/107789

