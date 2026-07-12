# 技术债务登记

> Updated: 2026-07-10  
> 详见功能现状：[详解/功能详解.md](../详解/功能详解.md)  
> 规划入口：[plans/README.md](../plans/README.md) · [api-migration](../plans/api-migration/) · [e2e-devin](../plans/e2e-devin/) · [known-issues](./known-issues.md)

## 架构 / 基建

| ID | 项 | 状态 |
|----|-----|------|
| TD-01 | Python FastAPI → Next `app/api` 逐项迁移 | 待办（阶段 B） |
| TD-02 | 前端 `fetchApi` 改为同源，去掉对 8000 端口依赖 | 待办 |
| TD-03 | Supabase 全面切换 publishable / secret 新密钥 | 待办（模板已就绪） |
| TD-04 | 减少 service/secret 绕过 RLS，补家庭权限策略 | 待办 |

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

## Python 待迁清单（对照 `backend/api/v1`）

- [ ] auth（captcha / send-code / verify / refresh）
- [ ] users
- [ ] family
- [ ] messages
- [ ] medicine
- [ ] health
- [ ] ai_chat / ai_voice
- [ ] emergency
- [ ] radio

迁完一项，在此勾选并更新功能详解。
