# UI 重做 — 范围摘要（非实施规格）

> Created: 2026-07-10  
> Status: scope-only  
> **本文件不是逐页实施计划。** 细计划（wireframe、组件拆分、逐路由任务）需另开 `docs/plans/ui-redesign/plan-*.md` 并单独批准。

## 目标

在对应 [api-migration](../api-migration/) 域稳定之后，按适老化规则重做视觉与交互。

- **默认**：换皮为主（同路由、同信息架构）。
- **信息架构大改**（改 Tab、合并/删页）：必须单独批准，不在默认范围内。

## 将更新的表面（清单）

| 表面 | 路由 / 组件 | 备注 |
|------|-------------|------|
| 登录 | `/login` | 跟在 auth 迁稳后 |
| 角色选择 | `/onboarding` | |
| Elder 首页 | `/` + `ElderHomeView` | |
| Family 首页 | `/` + `FamilyHomeView` | |
| 健康看板 / 录入 | `/health`、`/health/input` | |
| 用药 | `/medicine`、`/medicine/history` | PlanForm 是否挂路由属产品决策 |
| 消息 | `/messages`、`/messages/[id]` | |
| 设置 / 资料 / 绑定 / 无障碍 | `/settings/*` | |
| 语音助手 | `/voice` | 含真实 ASR 接线决策 |
| 健康广播 | `/radio` | 含是否进 Tab |
| 紧急入口 | 待定 | FAB / SOS；API 见 api-migration/10 |

设计参考：[`docs/designs/ui/`](../../designs/ui/)。

## 约束

- 跟在对应 API 域迁移之后，避免与 `app/api` 改动抢同一文件无序冲突。
- 遵守 [AGENTS.md](../../../AGENTS.md) 与工作区适老化规则（大触控、可读字号、少仪表盘感）。
- 每域 UI 改完应能被 [e2e-devin](../e2e-devin/) 对应冒烟锁住。

## 本轮明确不做

- 不产出逐页 wireframe 或组件级任务表。
- 不在本摘要内排期或估点。
- 不强制全面 Tailwind 重写（迁移期允许 CSS Modules）。
