# E2E 冒烟路径（P0 / P1 / P2）

> Updated: 2026-07-10

## P0 — 必须绿（主价值闭环）

| # | 步骤 | 通过标准 |
|---|------|----------|
| 1 | 打开 `/login`，完成图形验证码 + 邮箱 OTP | 进入应用或 onboarding，非卡死/500 |
| 2 | 若无角色 → `/onboarding` 选 Elder 或 Family | 进入首页，主题大致正确 |
| 3 | 首页 | Elder：可见语音入口；Family：可见看板类内容 |
| 4 | `/health`；必要时 `/health/input` 写一条 | 看板或录入成功反馈 |
| 5 | `/medicine` | 页面可开；有今日项时可确认一次 |
| 6 | `/messages` → 打开会话 → 发一条文本 | 列表可见；发送后气泡或列表更新 |
| 7 | `/settings/bind` | 绑定区 UI 可见（有码/列表即可） |

**P0 失败则不得宣称「端到端跑通」。**

## P1 — 域迁完后追加

| # | 步骤 | 通过标准 |
|---|------|----------|
| A | `/voice` 发一条**文本**对话 | 有 AI 回复（允许无真 ASR） |
| B | `/radio` | 列表或分类可展示 |

## P2 — 非首轮阻塞

| # | 步骤 | 说明 |
|---|------|------|
| C | 紧急呼叫完整 UI 闭环 | 依赖 FAB/SOS；见 ui-redesign |
| D | Native JSBridge TTS/ASR | 桥名不一致，见 known-issues |
| E | Realtime / 离线同步 | 未挂载 |

## 与迁移任务映射

| 迁移包 | 优先验证 |
|--------|----------|
| 01-auth | P0-1 |
| 02-users / 03-family | P0-2, P0-7 |
| 04-health | P0-4 |
| 05-medicine | P0-5 |
| 06-messages | P0-6 |
| 07-ai | P1-A |
| 09-radio | P1-B |
| 11-cutover | 全 P0（单进程 Next） |
