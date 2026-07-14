# 技术债务登记

> Updated: 2026-07-13
>
> 详见功能现状：[详解/功能详解.md](../详解/功能详解.md)
>
> 规划入口：[plans/README.md](../plans/README.md) · [api-migration](../plans/api-migration/) · [known-issues](./known-issues.md)

## 架构 / 基建

| ID | 项 | 状态 |
|----|-----|------|
| TD-01 | Python FastAPI → Next `app/api` 迁移 | ✅ 已完成（2026-07；历史 `backend/` 已删除） |
| TD-02 | `fetchApi` 改为同源，去掉生产对 8000 端口依赖 | ✅ 已完成（`lib/api.ts` 默认同源） |
| TD-03 | Supabase 全面切换 publishable / secret 新密钥 | 待清尾：服务端已用 `SUPABASE_SECRET_KEY`，客户端仍保留旧 anon 键名回退 |
| TD-04 | 减少 secret 绕过 RLS，统一家庭权限并补跨用户门控 | 待办 |
| TD-05 | Schema `oc_` 前缀与运行时代码对齐 | ✅ 已完成（2026-07，见 [ops/oc-table-prefix.md](../ops/oc-table-prefix.md)） |

## 产品功能缺口

| ID | 项 | 状态 |
|----|-----|------|
| TD-10 | 紧急呼叫外部闭环（电话 / 短信 / 推送与家属状态入口） | 部分：Elder 首页触发与应用内反馈已完成 |
| TD-11 | AI 语音助手动作分发 | 部分：MiMo ASR/TTS 已完成；`intentHandlers` 仍未挂载 |
| TD-12 | `useRealtimeSync` / `offlineSync` 挂入应用壳 | 未挂载 |
| TD-13 | `PlanForm` 等用药组件提供正式路由 | 未挂载 |
| TD-14 | 广播生成、私有存储与鉴权播放链路 | ✅ 已完成（MiMo MP3 + private Storage + 签名播放） |

## Android 在线壳

| ID | 项 | 状态 |
|----|-----|------|
| TD-20 | 移除不一致的 `AndroidBridge` / `SangZiBridge` 旧路径 | ✅ 已完成：`lib/jsbridge.ts` 已删除，原生不注入业务 JavaScript bridge |
| TD-21 | 配置 Release 正式 `app_base_url` | ✅ 已完成：`https://sangzicare.husteread.com`；Debug 独立使用回环开发地址 |
| TD-22 | Release APK 的部署一致性与可追溯性 | 持续门禁：线上验收后，从对应干净提交重建并记录提交、签名摘要与 APK SHA-256 |

## 上线前置（不是可延期技术债）

以下条件缺一不可，不能因为源码已合并就标记生产可用：

1. 在目标 Supabase 应用并核验 [`20260713230000_auth_challenges.sql`](../../supabase/migrations/20260713230000_auth_challenges.sql)；认证依赖其中的原子 `oc_auth_challenge_*` RPC。
2. 预建 `SUPABASE_VOICE_BUCKET` 对应的 private bucket；消息语音与广播在上传、签名前都会验证 `public === false`。
3. 在 EdgeOne Production 环境配置与 [.env.example](../../.env.example) 同名的变量；生产 API 保持同源，服务端密钥只留在云端变量中。
4. 推送 EdgeOne 实际监听的分支，等待目标提交部署并完成登录、MiMo 语音、私有音频与 AI 冒烟测试。
5. 最后从同一目标提交的干净工作树构建签名 APK；构建脚本会在 Gradle 前拒绝 tracked / untracked 变更，不得提交 APK、keystore 或 `.env*`。

## 历史 Python 迁移（已完成）

认证、用户、家庭、消息、用药、健康、AI、紧急呼叫与广播 API 已全部迁入 `app/api/**`。历史 Python `backend/` 目录已于 2026-07-12 删除，不再作为现行实现或测试真理。
