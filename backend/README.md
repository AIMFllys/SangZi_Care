# backend/ — 遗留对照（只读）

> 状态: **migration reference only**  
> 更新: 2026-07-10

本目录为历史 **Python FastAPI** 实现，用于对照业务规则与表结构。

## 规则

- **不要**在此新增产品功能或新路由作为上线路径
- 等价能力应实现在 Next.js `app/api/**`（阶段 B）
- 本地过渡期可仍运行本服务，供 `NEXT_PUBLIC_API_BASE_URL` 指向
- 迁移完成后本目录将归档或删除

目标架构见 [docs/designs/target-architecture.md](../docs/designs/target-architecture.md)。
