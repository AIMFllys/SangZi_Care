# 00 — 共享服务端基建

> Status: planned · 无业务路由

## 1. 背景与对照

| 对照 | 路径 |
|------|------|
| JWT | [`backend/core/security.py`](../../../backend/core/security.py) |
| 鉴权 Depends | [`backend/core/middleware.py`](../../../backend/core/middleware.py) |
| PostgREST | [`backend/services/supabase_client.py`](../../../backend/services/supabase_client.py) |

本任务是后续所有域的**唯一共享底座**。不实现任何 `/api/v1/<业务>` 路由。

## 2. 目标能力

| 模块 | 职责 |
|------|------|
| `lib/server/supabase.ts` | 使用 `SUPABASE_SECRET_KEY` + `NEXT_PUBLIC_SUPABASE_URL` 创建服务端客户端（或 PostgREST fetch 封装） |
| `lib/server/auth.ts` | 解析 `Authorization: Bearer`；`createAccessToken` / `createRefreshToken` / `requireUser`；claims 与 Python 对齐：`sub`、`role`、refresh 带 `type: "refresh"` |
| `lib/server/errors.ts` | 统一 `{ detail: string }` JSON 与 HTTP 状态码辅助 |
| `lib/server/env.ts`（可选） | 读取并校验必要服务端环境变量 |

## 3. 文件落点

```
lib/server/
  supabase.ts
  auth.ts
  errors.ts
```

可增加 `lib/server/index.ts` barrel，**不要**在本任务创建 `app/api/v1/**` 业务目录。

## 4. 环境变量

- `JWT_SECRET`、`JWT_ALGORITHM`（默认 HS256）、`JWT_EXPIRE_MINUTES`（对照 config）
- `SUPABASE_SECRET_KEY`、`NEXT_PUBLIC_SUPABASE_URL`

## 5. 验收步骤

1. 单元测试或脚本：签发 access token → `requireUser` 解出 `user_id`/`role`。
2. 过期 / 缺 claim 返回 401。
3. secret 客户端能对某一已知表做只读探测（如 `users` limit 1）——仅开发环境。

## 6. 风险与非目标

- **非目标**：不迁 auth/users 等业务；不改前端。
- **风险**：secret key 绝不能进 `NEXT_PUBLIC_*`；EdgeOne 上必须配置同名密钥。

## 7. Devin

本任务无 UI 路径。Devin 可跳过；或仅确认 `npm run build` 通过。
