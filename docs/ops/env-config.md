# 环境变量配置

> Updated: 2026-07-13

本地使用 **`.env.local`**（勿提交）。生产在 **EdgeOne 控制台**配置**同名键**。

模板见仓库根目录 [.env.example](../../.env.example)。

## 键说明

| 键 | 暴露 | 说明 |
|----|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 客户端 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 客户端 | 新 publishable key（`sb_publishable_...`）；替代旧 `ANON_KEY` |
| `SUPABASE_SECRET_KEY` | 仅服务端 | 新 secret key（`sb_secret_...`）；替代旧 `SERVICE_ROLE_KEY` |
| `SUPABASE_VOICE_BUCKET` | 仅服务端 | 必填；预先创建的私有消息语音 bucket，用于保存 WAV；不得设为 public |
| `NEXT_PUBLIC_APP_URL` | 客户端 | 生产/预览站点 URL（Android 壳可对齐） |
| `NEXT_PUBLIC_API_BASE_URL` | 客户端 | API 已迁入 Next 同源；默认留空。仅调试旧 Python 时指向 `http://localhost:8000` |
| `MIMO_API_KEY` | 仅服务端 | Xiaomi MiMo ASR / TTS 密钥；禁止加 `NEXT_PUBLIC_` |
| `MIMO_API_BASE_URL` | 仅服务端 | 可选；默认 `https://api.xiaomimimo.com/v1`。必须与控制台发放的 Key、账号区域和计费类型成对使用 |
| `MIMO_TTS_MODEL` / `MIMO_ASR_MODEL` | 仅服务端 | 可选；默认 `mimo-v2.5-tts` / `mimo-v2.5-asr` |
| `MIMO_TTS_VOICE` | 仅服务端 | 可选；默认中文女声 `冰糖`，只接受官方内置音色 |
| `MIMO_TIMEOUT_MS` | 仅服务端 | 可选；单次上游请求超时，默认 45000ms，需早于 EdgeOne 60 秒函数上限 |
| `JWT_SECRET` / `VOLCANO_ARK_*` / `SMTP_*` | 仅服务端 | 鉴权、AI 文本和邮件；勿加 `NEXT_PUBLIC_` |

## 规则

1. 无 `NEXT_PUBLIC_` 前缀的变量**不得**出现在浏览器包中  
2. 旧 `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 为遗留命名，迁移到上表新键  
3. MiMo 国内/海外区域会返回不能互换的 Base URL 与 Key；不要自动跨区尝试，也不要把密钥写入日志
4. 语音 bucket 必须显式配置；每次上传和签名前都会读取 bucket 元数据。缺失、查询失败、公开或无权限时返回安全 503，不追加假消息或签发播放地址
5. 官方说明：[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

## 本地文件建议

```bash
cp .env.example .env.local
```

真实密钥只放在 `.env.local` 与云控制台。
