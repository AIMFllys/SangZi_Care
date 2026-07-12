# 本地环境搭建

> Updated: 2026-07-10

## 要求

- Node.js 22.x（推荐与 EdgeOne 一致：22.11.0）
- npm
- （可选）Python 3.9+：仅当仍需跑遗留 `backend/` 时

## 步骤

```bash
cp .env.example .env.local
# 填写 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 等

npm install
npm run dev
```

- 前端/全栈开发服务器：**http://localhost:7742**
- 探针：`GET /api/ping` → `{ "ok": true, ... }`

## 过渡期双进程（可选）

业务 API 尚未全部迁入 Next 时：

1. 终端 A：`npm run dev`
2. 终端 B：按 `backend/README.md` 启动 FastAPI（默认 8000）
3. `.env.local` 中 `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`

API 迁入 `app/api` 后，去掉独立后端，并将 API 基址改为同源（空或同域）。

## 相关

- [env-config.md](./env-config.md)
- [scripts/README.md](../../scripts/README.md)
