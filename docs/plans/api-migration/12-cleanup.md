# 12 — 清理与文档收尾

> Status: planned · 依赖 [11-frontend-cutover](./11-frontend-cutover.md)

## 1. 目标

在 API 已全部由 Next 提供后，收束遗留 Python 与文档状态。

## 2. 步骤清单

1. 更新 [`backend/README.md`](../../../backend/README.md)：状态改为 **deprecated / archived**，指向本目录。
2. 勾选 [`docs/issues/tech-debt.md`](../../issues/tech-debt.md) 中 TD-01、TD-02 及 Python 待迁清单。
3. 更新 [`docs/详解/项目结构详解.md`](../../详解/项目结构详解.md)、[`功能详解.md`](../../详解/功能详解.md)：backend 标历史；API 落点改为 `app/api`。
4. 更新 [`docs/designs/target-architecture.md`](../../designs/target-architecture.md)：阶段 B 完成说明。
5. **可选**：将 `backend/` 移至 `docs/archive/backend-fastapi/` 或删除（需单独批准；默认本任务只标废弃不删）。
6. 根 [`README.md`](../../../README.md) 去掉「过渡期双进程」为主叙事。

## 3. 验收

- 文档无「必须启动 Python 才能开发」的现行指引。
- tech-debt 迁移项已勾选或注明例外。

## 4. 非目标

- 不重做任何页面 UI。
- 不强制上 Realtime / 离线。

## 5. Devin

回归 smoke-p0 一次；录像归档为「全栈切流完成」基线。
