# 技术债务登记

> Updated: 2026-07-13
> 详见功能现状：[详解/功能详解.md](../详解/功能详解.md)  
> 规划入口：[plans/README.md](../plans/README.md) · [api-migration](../plans/api-migration/) · [e2e-devin](../plans/e2e-devin/) · [known-issues](./known-issues.md)

## 架构 / 基建

| ID | 项 | 状态 |
|----|-----|------|
| TD-01 | Python FastAPI → Next `app/api` 逐项迁移 | ✅ 已完成（2026-07，见 [docs/plans/api-migration/](../plans/api-migration/)） |
| TD-02 | 前端 `fetchApi` 改为同源，去掉对 8000 端口依赖 | ✅ 已完成（`lib/api.ts` 默认 `''`） |
| TD-03 | Supabase 全面切换 publishable / secret 新密钥 | 待办（模板已就绪） |
| TD-04 | 减少 service/secret 绕过 RLS，补家庭权限策略 | 待办 |
| TD-05 | Schema `oc_` 前缀与运行时代码对齐 | ✅ 已完成（2026-07，见 [ops/oc-table-prefix.md](../ops/oc-table-prefix.md)） |

## 产品功能缺口

| ID | 项 | 状态 |
|----|-----|------|
| TD-10 | 紧急呼叫前端闭环（无 FAB / 未接 trigger） | 占位 |
| TD-11 | `/voice` 真实 ASR；`intentHandlers` 未挂载 | 部分 |
| TD-12 | `useRealtimeSync` / `offlineSync` 未挂入壳 | 未挂载 |
| TD-13 | `PlanForm` 等用药组件无路由 | 未挂载 |
| TD-14 | 广播播放与生成音频链路不完整 | 部分 |

## Android / 桥接

| ID | 项 | 状态 |
|----|-----|------|
| TD-20 | 前端 `AndroidBridge` vs 原生 `SangZiBridge` 契约不一致 | 已知 |
| TD-21 | 模式 B 上线后需配置正式 `app_base_url` | 配置项 |

## Python 待迁清单（已完成；历史 `backend/api/v1` 已删除）

- [x] auth（captcha / send-code / verify / refresh）
- [x] users
- [x] family
- [x] messages
- [x] medicine
- [x] health
- [x] ai_chat / ai_voice
- [x] emergency
- [x] radio

全部迁完（2026-07），功能详解已同步。历史 Python `backend/` 目录已于 2026-07-12 删除。
