# 环境变量配置

> Updated: 2026-07-10

本地使用 **`.env.local`**（勿提交）。生产在 **EdgeOne 控制台**配置**同名键**。

模板见仓库根目录 [.env.example](../../.env.example)。

## 键说明

| 键 | 暴露 | 说明 |
|----|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 客户端 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 客户端 | 新 publishable key（`sb_publishable_...`）；替代旧 `ANON_KEY` |
| `SUPABASE_SECRET_KEY` | 仅服务端 | 新 secret key（`sb_secret_...`）；替代旧 `SERVICE_ROLE_KEY` |
| `NEXT_PUBLIC_APP_URL` | 客户端 | 生产/预览站点 URL（Android 壳可对齐） |
| `NEXT_PUBLIC_API_BASE_URL` | 客户端 | API 已迁入 Next 同源；默认留空。仅调试旧 Python 时指向 `http://localhost:8000` |
| `JWT_SECRET` / `VOLCANO_*` / `SMTP_*` | 仅服务端 | API 迁入 Next 时使用；勿加 `NEXT_PUBLIC_` |

## 规则

1. 无 `NEXT_PUBLIC_` 前缀的变量**不得**出现在浏览器包中  
2. 旧 `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 为遗留命名，迁移到上表新键  
3. 官方说明：[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

## 本地文件建议

```bash
cp .env.example .env.local
```

真实密钥只放在 `.env.local` 与云控制台。
