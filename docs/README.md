# docs/

桑梓智护（智护银龄）项目内部文档。

> 最后更新: 2026-07-14
> 架构方向: 腾讯云 EdgeOne 全栈 Next.js · Android 在线 WebView 壳  
> AI 操作规范见根目录 [AGENTS.md](../AGENTS.md)

## 从这里开始

| 优先级 | 文档 | 说明 |
|--------|------|------|
| 1 | [designs/target-architecture.md](./designs/target-architecture.md) | 目标架构终局（必读） |
| 2 | [plans/README.md](./plans/README.md) | 三大后续规划（API / UI 摘要 / Devin E2E） |
| 3 | [详解/项目结构详解.md](./详解/项目结构详解.md) | 目录与分层现状 |
| 4 | [详解/功能详解.md](./详解/功能详解.md) | 功能成熟度与缺口 |
| 5 | [ops/local-setup.md](./ops/local-setup.md) | 本地运行 |
| 6 | [ops/deploy-edgeone.md](./ops/deploy-edgeone.md) | EdgeOne 部署 |

## 目录结构

| 目录 | 用途 |
|------|------|
| [`详解/`](./详解/) | 现行真相：结构 + 功能现状 |
| [`designs/`](./designs/) | 架构/UI 设计（含 `target-architecture.md`、`ui/` 参考稿） |
| [`plans/`](./plans/) | 三大板块规划：api-migration · ui-redesign · e2e-devin |
| [`conventions/`](./conventions/) | 编码与架构规范（人类向；与 AGENTS.md 对齐） |
| [`updates/`](./updates/) | 变更日志 |
| [`specs/`](./specs/) | 功能/API 规格 |
| [`audits/`](./audits/) | 性能/安全/代码审计 |
| [`ops/`](./ops/) | 本地运行、部署、环境变量 |
| [`issues/`](./issues/) | tech-debt · known-issues |
| [`archive/`](./archive/) | 旧规划/教程/MCP 文档整包归档（不改正文） |

## 文档规范

- 使用 Markdown；活文档文件名优先 kebab-case（中文目录名 `详解/` 为历史保留）
- 文首注明创建/更新日期
- **现状**写在 `详解/`；**目标态**写在 `designs/` / `specs/`
- 旧内容只进 `archive/`，不在活文档区继续扩写

## 明确不在活文档区的内容

- 独立 Python FastAPI 部署指南（已废弃；历史 `backend/` 已删除，API 全在 Next `app/api`）
- 静态导出拷贝进 APK 的流程（已废弃；Android 改为打开线上域名）
- 以 MCP/Kiro 配置为主的旧「必读」教程（见 `archive/`）
