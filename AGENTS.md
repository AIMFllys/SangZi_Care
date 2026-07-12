# AGENTS.md — sangzi-smart-care（桑梓智护 / 智护银龄）

## Project Overview

面向老年人及其家属的智能养老应用「智护银龄」。双角色（Elder / Family）、适老化 UI、健康/用药/消息/绑定/AI 等能力。

- **部署**：腾讯云 EdgeOne Pages / Makers **全栈 Next.js**（Git 连接自动部署）
- **移动端**：Android WebView **在线壳**（打开 https 域名；不内嵌静态整站；不考虑离线）
- **数据**：Supabase；客户端 publishable key，服务端 secret key
- **遗留**：`backend/`（Python FastAPI）仅迁移期**只读对照**；新业务禁止只写在 Python
- **目标架构**：见 [docs/designs/target-architecture.md](docs/designs/target-architecture.md)

## Tech Stack

- **Framework**: Next.js ≥16.2.0（App Router；**禁止** `output: 'export'`）
- **React**: ≥19.2
- **Language**: TypeScript（strict）
- **Package Manager**: **npm**（以仓库 lockfile 为准；本阶段不要无故改用 pnpm）
- **State**: Zustand 5
- **Styling**: CSS Modules + 双主题（迁移期保留）；`globals.css` 可含 Tailwind v4 工具层；不强制重写旧页为纯 Tailwind
- **DB**: Supabase（PostgreSQL）
- **Test**: Vitest + Testing Library
- **Deploy**: EdgeOne；构建产物目录 **`.next`**
- **Legacy**: Python FastAPI under `backend/`（对照用）

## Key Commands

- Install: `npm install`
- Dev: `npm run dev`（端口 **7742**）
- Build: `npm run build`
- Start: `npm start`
- Typecheck: `npm run tsc`
- Lint: `npm run lint`
- 过渡期可选：另开终端运行 `backend/`（见 docs/ops）；API 迁入 Next 后不再需要

## Definition of Done

任务完成须同时满足：

1. `npm run lint` 退出码 0（若项目尚未配置 eslint 可跳过并注明）
2. `npm run tsc` 退出码 0
3. `npm run build` 退出码 0
4. **未**把 `output: 'export'` 加回 `next.config.ts`
5. **未**提交 `.env` / `.env.local` 或任何真实密钥
6. 文档与实现冲突时，已更新 `docs/详解/` 或 `docs/designs/`

## Project Structure（当前真实 + 方向）

```
.
├── app/                    # Next App Router（页面 + 未来 app/api）
├── components/             # UI 与业务组件
├── hooks/ · lib/ · stores/ · styles/ · types/
├── backend/                # Python 遗留对照（勿扩展新业务）
├── android/                # 在线 WebView 壳
├── docs/                   # 见 docs/README.md
│   ├── 详解/               # 现状真相
│   ├── designs/            # 目标架构与 UI 参考
│   ├── ops/ · issues/ · …
│   └── archive/            # 旧文档归档
├── scripts/                # setup / build / deploy / dev
├── AGENTS.md
├── edgeone.json
├── next.config.ts
└── package.json
```

- 业务 API **目标**落在 `app/api/**/route.ts`（阶段 B 逐项迁移）
- 本阶段不强制迁到 `src/features/`

## Non-Obvious Patterns

### 全栈 vs 静态导出

- 全栈：**不要** `output: 'export'`；EdgeOne 输出 **`.next`**
- 纯静态 `out/` 仅历史方案，已废弃
- redirects/rewrites 写在 `edgeone.json`，不要写在 `next.config.ts`

### Next.js 16

- 网络边界用 `proxy.ts`（导出 `proxy`），不要用已废弃的 `middleware.ts`
- `params` / `searchParams` / `cookies()` / `headers()` 需 `await`

### Supabase 密钥

- 浏览器：`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（`sb_publishable_...`）
- 服务端：`SUPABASE_SECRET_KEY`（`sb_secret_...`）
- 旧 `anon` / `service_role` JWT 键为遗留，迁移期可并存，目标全部切换到新键

### Android

- 加载 `strings.xml` / 配置中的 `app_base_url`（https）
- 前端 `lib/jsbridge.ts` 与原生 `SangZiBridge` 命名不一致 — 见 tech-debt，修复前勿假设 Native ASR/TTS 可用

## EdgeOne 约束（摘要）

- 单文件 ≤ 25MB；构建超时等以官方配额为准
- 环境变量：本地 `.env.local` 与控制台**同名**；无 `NEXT_PUBLIC_` 前缀的密钥仅服务端
- 参考：[Next.js 框架指南](https://pages.edgeone.ai/zh/document/framework-nextjs)

## When Writing Code

- 迁移期：**禁止**只在 `backend/` 新增产品功能；对照实现可在 Next 侧重写
- 页面保持适老化（大触控、可读字号）；新 UI 可用 Tailwind，旧 CSS Modules 不强制重写
- 调试原型可放临时路由，勿把密钥打进客户端
- 变更架构/部署相关文件时同步更新 `docs/详解` 或 `designs/target-architecture.md`

## When Reviewing Code

- 是否重新引入 `output: 'export'`
- 是否把 secret 写进 `NEXT_PUBLIC_*` 或提交 `.env`
- 是否只改了 Python 而未规划 Next 侧等价实现
- redirects 是否误写进 next.config

## Boundaries

### 允许不询问

- 读代码、跑 lint/tsc/build、改 `app/` `components/` `docs/` `AGENTS.md`（非破坏性）
- 新增/完善 `app/api/ping` 类探针

### 先询问

- 删除整个 `backend/`
- 大版本依赖变更、更换包管理器
- 改 `edgeone.json` 区域/时长等部署关键项（若影响生产）
- 强制全量 Tailwind / `src/` 大挪移

### 禁止

- 提交密钥与 `.env*`
- Force push 到 main
- 为「方便打 APK」恢复静态导出作为默认生产路径
- 将 `docs/archive/` 内容当作现行规范继续扩写

## Key Files

- [AGENTS.md](./AGENTS.md) — 本文件
- [docs/designs/target-architecture.md](docs/designs/target-architecture.md)
- [docs/详解/项目结构详解.md](docs/详解/项目结构详解.md)
- [docs/详解/功能详解.md](docs/详解/功能详解.md)
- [edgeone.json](./edgeone.json)
- [next.config.ts](./next.config.ts)
- [.env.example](./.env.example)
