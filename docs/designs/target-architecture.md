# 目标架构 — 桑梓智护全栈 Next.js

> Created: 2026-07-10  
> Updated: 2026-07-10  
> Status: accepted

## 问题陈述

仓库曾同时存在：Next 静态导出前端、独立 Python FastAPI、Android 内嵌 `out/` 静态包。栈重复、密钥分散、文档与实现脱节，不利于腾讯云 EdgeOne 一键部署。

## 最终决策

| 维度 | 决策 |
|------|------|
| 应用形态 | **全栈 Next.js ≥16.2**（App Router + Route Handlers） |
| 部署 | **腾讯云 EdgeOne Pages / Makers**，Git 连接自动构建 |
| 构建 | **禁止** `output: 'export'`；全栈产物为 **`.next`** |
| 移动端 | **模式 B**：WebView/浏览器打开线上 https，不内嵌整站 |
| 数据 | **Supabase**；客户端用 publishable key，服务端用 secret key |
| 旧后端 | `backend/`（Python）**只读对照**，业务 API 后续迁入 `app/api` |
| 包管理 | 本阶段保持 **npm**（以 lockfile 为准） |

## 终局数据流

```text
手机浏览器 / Android WebView
  → https://<EdgeOne 域名>
      → Next 页面（UI）
      → Next Route Handlers（原 FastAPI 能力）
            → 环境变量中的 SMTP / 豆包 / SUPABASE_SECRET_KEY
            → Supabase（PostgreSQL）
```

## 迁移阶段

### 阶段 A（本基建 PR）— 规范与运行时骨架

- docs / AGENTS / README / scripts 对齐目标态
- 去掉静态导出；新增 `edgeone.json`、`.env.example`、`/api/ping`
- Android 改为可配置线上 URL
- **不**重写 Python 业务路由

### 阶段 B（后续）— 逐项迁 API

顺序建议：auth → users/family → health/medicine/messages → ai/radio/emergency  
前端 `fetchApi` 改为同源 `/api/...`，最后归档或删除 `backend/`。

## 明确不做（本阶段及原则）

- 不把 TS 业务 1:1 重写成 Kotlin 原生 App
- 不要求离线可用整站
- 本阶段不强制迁到 `src/features/`、不强制全面 Tailwind 重写
- 不把密钥写入仓库或客户端包（除 `NEXT_PUBLIC_*`）

## 决策理由

- EdgeOne 官方支持 Next 全栈（SSR / Route Handlers / proxy），与「一个仓库、一套环境变量」一致
- 在线壳消除静态导出与动态路由深链冲突
- 保留 Python 对照降低一次性重写风险

## 相关文档

- [项目结构详解](../详解/项目结构详解.md)
- [功能详解](../详解/功能详解.md)
- [环境变量](../ops/env-config.md)
- [EdgeOne 部署](../ops/deploy-edgeone.md)
- [AGENTS.md](../../AGENTS.md)
