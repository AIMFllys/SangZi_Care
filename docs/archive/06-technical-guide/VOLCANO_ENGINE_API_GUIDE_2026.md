# 火山引擎（豆包）API 对接指南（2026 安全版）

本文档已移除所有明文密钥，敏感信息仅保存在项目根目录 `.env`。

- 文档更新时间：2026-02-26
- 敏感字段：`API Key / AppID / Access Token / Secret Key`
- 管理原则：代码与文档仅使用环境变量，不写死凭证

## 0. 代码接入文档

- 详细项目级调用指南见：
  - `docs/06-technical-guide/VOLCANO_ENGINE_AI_INTEGRATION_PLAYBOOK_2026.md`

## 1. 环境变量约定

```bash
# Ark（通用大模型）
VOLCANO_ARK_API_KEY=

# 语音能力（TTS / ASR / Realtime Voice）
VOLCANO_APP_ID=
VOLCANO_ACCESS_TOKEN=
VOLCANO_SECRET_KEY=

# 资源ID（实例ID）
VOLCANO_TTS_RESOURCE_ID=
VOLCANO_ASR_STREAM_RESOURCE_ID=
VOLCANO_ASR_BATCH_STANDARD_RESOURCE_ID=
VOLCANO_ASR_BATCH_FAST_RESOURCE_ID=
VOLCANO_ASR_BATCH_IDLE_RESOURCE_ID=
VOLCANO_REALTIME_VOICE_RESOURCE_ID=
```

## 2. 鉴权与接入方式总览

### 2.1 Ark（通用大模型）

- 鉴权方式：`Authorization: Bearer <ARK_API_KEY>`
- 建议：服务端注入 `VOLCANO_ARK_API_KEY`，前端不落地密钥
- API Key 管理：控制台长期 Key + `GetApiKey` 生成临时 Key（适合短时授权）

### 2.2 语音模型（TTS / ASR / 实时语音）

- 常见鉴权字段：`AppID + Access Token + Secret Key`
- 接口协议：以 WebSocket 为主，部分场景支持 HTTP
- 重点：签名与鉴权必须在服务端完成，避免浏览器直接持有 `Secret Key`

## 3. 各模型对接说明（按你当前配置）

### 3.1 豆包语音合成（TTS）

- 资源变量：`VOLCANO_TTS_RESOURCE_ID`
- 接口：优先 WebSocket（流式播放），也可用 HTTP（非流式）
- 关键参数：发音人（speaker/voice）、采样率、输出编码（mp3/wav/aac）、文本或 SSML
- 适配建议：
  - 长文本使用流式合成
  - 固定引导词做音频缓存，降低重复调用成本

### 3.2 流式语音识别（Streaming ASR）

- 资源变量：`VOLCANO_ASR_STREAM_RESOURCE_ID`
- 接口：WebSocket
- 实时性建议：20ms 音频分片上传，按服务协议控制首包和续包
- 结果处理：增量转写 + 最终句落盘，避免 UI 抖动

### 3.3 录音文件识别（Batch ASR）

- 资源变量：
  - `VOLCANO_ASR_BATCH_STANDARD_RESOURCE_ID`
  - `VOLCANO_ASR_BATCH_FAST_RESOURCE_ID`
  - `VOLCANO_ASR_BATCH_IDLE_RESOURCE_ID`
- 典型流程：提交任务 -> 轮询/回调 -> 拉取结果
- 可选能力：说话人分离、数字归一化（按接口参数开启）

### 3.4 端到端实时语音大模型（Realtime Voice）

- 资源变量：`VOLCANO_REALTIME_VOICE_RESOURCE_ID`
- 典型链路：ASR + LLM + TTS 一体化会话
- 建议：
  - 建立会话级状态（session）
  - 服务端托管鉴权并下发短时会话令牌

## 4. 推荐落地架构

1. 前端仅传业务参数与音频流，不持有任何长期密钥。
2. 后端统一网关注入 `.env` 中的密钥并签名请求。
3. Ark 场景统一走 OpenAI 兼容调用层，便于模型切换。
4. 语音场景拆分为独立服务（TTS/ASR）并记录请求日志 ID，便于排障。

## 5. 安全与运维基线

- 禁止在 `docs/`、`README`、前端源码、日志中输出明文密钥
- 定期轮换 `API Key` 与 `Access Token`，并设置最小权限
- 生产环境优先短期凭证（临时 API Key / STS 思路）
- CI 增加密钥扫描（如检测 `sk-`、UUID Key、Access Token 模式）

## 6. 官方文档（核对来源）

- 获取 API Key 并配置（方舟，最近更新时间 2026-02-03）
  - https://www.volcengine.com/docs/82379/1263279
- Base URL 及鉴权（方舟）
  - https://www.volcengine.com/docs/82379/1298459
- 管理 API Key / GetApiKey（方舟临时 Key，更新时间 2025-05-23）
  - https://www.volcengine.com/docs/82379/1262825
- 兼容 OpenAI SDK（方舟，更新时间 2026-02-16）
  - https://www.volcengine.com/docs/82379/1330626
- 音频技术 WebSocket API（TTS/语音类协议）
  - https://www.volcengine.com/docs/6489/80993
- 豆包语音鉴权方法（ASR/语音鉴权示例，更新时间 2025-07-03）
  - https://www.volcengine.com/docs/6561/107789


