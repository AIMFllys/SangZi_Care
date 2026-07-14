# 本地环境搭建

> Updated: 2026-07-13

## 要求

- Node.js 22.x（推荐与 EdgeOne 一致：22.17.1）
- npm

## 步骤

```bash
cp .env.example .env.local
# 填写 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 等

npm install
npm run dev
```

- 前端/全栈开发服务器：**http://localhost:7742**
- 探针：`GET /api/ping` → `{ "ok": true, "revision": "<40 位 Git SHA>", ... }`；响应为 `no-store`

业务 API 全部由 Next.js 同源提供（`/api/v1/...`），无需独立后端进程。历史 Python `backend/` 已删除。

## 相关

- [env-config.md](./env-config.md)
- [scripts/README.md](../../scripts/README.md)
