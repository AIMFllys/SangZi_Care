# 已知问题（E2E / 迁移易红项）

> Updated: 2026-07-12  
> 供 Devin 与人工排障。修复跟踪见 [tech-debt.md](./tech-debt.md)。  
> 功能成熟度见 [详解/功能详解.md](../详解/功能详解.md)。

## 环境与测试基建

| ID | 现象 | 影响 | 备注 |
|----|------|------|------|
| KI-01 | `package.json` 无 `test` script | 单元测试不进默认 CI 心智 | 有 vitest 文件 |
| KI-02 | 登录依赖真实 SMTP/邮箱 OTP | Devin 自动化易卡在收信 | 可用预置 token 跳过 P0-1 |
| KI-03 | ~~过渡期可能需 Python :8000~~ | ~~双进程易漏起~~ | ✅ 已解决（2026-07 切流完成，前端同源 `/api/...`，无需 Python 进程） |
| KI-04 | 旧 backend 测试与邮箱+验证码流可能不一致 | pytest 不能当现网真理 | backend 已归档 |

## 产品半成品（勿当回归）

| ID | 现象 | 对应 |
|----|------|------|
| KI-10 | `/voice` ASR 为 Mock | TD-11 |
| KI-11 | 紧急 SOS 无完整 UI / 无 FAB | TD-10 |
| KI-12 | Realtime / offline 未挂载 | TD-12 |
| KI-13 | PlanForm 无路由 | TD-13 |
| KI-14 | 广播播放链路不完整 | TD-14 |
| KI-15 | 首页天气/状态等硬编码文案 | 功能详解 |

## Android / 桥

| ID | 现象 | 对应 |
|----|------|------|
| KI-20 | 前端 `AndroidBridge` vs 原生 `SangZiBridge` | TD-20 |
| KI-21 | `app_base_url` 需配真实域名 | TD-21 |

## 数据与权限

| ID | 现象 | 对应 |
|----|------|------|
| KI-30 | 旧 anon/service_role 与 publishable/secret 并存期 | TD-03 |
| KI-31 | 家属跨用户读健康曾缺门控 | 迁移 04 应修 |
| KI-32 | 紧急通知权限字段曾不一致 | 迁移 03/10 |

## Devin 使用约定

- 失败时先查本表：若命中 KI-1x，标 **known**，不阻塞「迁移域 API 契约」通过。  
- P0 路径（登录、健康、用药、消息、绑定）失败且非本表 → **回归**，必须修。
