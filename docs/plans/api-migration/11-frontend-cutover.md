# 11 — 前端切流（同源 API）

> Status: planned · 依赖 01–10 均已合并，或明确废弃未迁域

## 1. 背景

[`lib/api.ts`](../../../lib/api.ts) 默认 `NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'`。  
目标：生产与本地全栈均打**同源** `/api/v1/...`。

## 2. 目标改动

| 项 | 做法 |
|----|------|
| `API_BASE_URL` | 默认 `''`（同源）；仅当显式设置 env 时才指向外部（调试旧 Python） |
| refresh URL | 使用同一基址 |
| [`.env.example`](../../../.env.example) | 注释改为「迁完后留空」 |
| [docs/ops/env-config.md](../../ops/env-config.md) | 同步 |
| 各 Store | 确认无写死 `localhost:8000` |

## 3. 文件落点

- `lib/api.ts`
- `.env.example`、`docs/ops/*`
- 全局搜 `8000` / `API_BASE_URL`

## 4. 验收步骤

1. 不设 `NEXT_PUBLIC_API_BASE_URL` 时，登录与 P0 主路径全部走 Next。
2. 网络面板无对 `:8000` 的请求。
3. `npm run build` 通过。

## 5. 风险与非目标

- **非目标**：不删除 `backend/` 目录（见 12）。
- 若某域未迁完：可暂时对该域保留代理或推迟本任务，**禁止**半切流导致混用且无文档。

## 6. Devin

完整跑 [smoke-p0.md](../e2e-devin/smoke-p0.md)（仅 Next 单进程）。
