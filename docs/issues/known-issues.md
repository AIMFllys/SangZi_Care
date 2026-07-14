# 已知问题（E2E / 上线易红项）

> Updated: 2026-07-13
>
> 供自动化与人工排障。修复跟踪见 [tech-debt.md](./tech-debt.md)。
>
> 功能成熟度见 [详解/功能详解.md](../详解/功能详解.md)。

## 环境与上线前置

| ID | 现象 | 影响 | 排查 |
|----|------|------|------|
| KI-01 | 目标 Supabase 未应用 `20260713230000_auth_challenges.sql` | CAPTCHA、发码与 OTP 校验安全返回 503 | 先应用 migration，再核验 `oc_auth_challenge_*` RPC；仓库中有文件不代表远端已执行 |
| KI-02 | 登录依赖真实 SMTP 与可收信邮箱 | 无邮件环境的 E2E 会卡在 OTP | 核验 EdgeOne 生产环境的 `SMTP_*`；自动化使用受控测试邮箱 / 收件箱 |
| KI-03 | `SUPABASE_VOICE_BUCKET` 缺失、bucket 不存在或被设为 public | 消息语音上传、鉴权播放和广播生成返回 503 | 预建 private bucket，并让本地与 EdgeOne 使用同名配置 |
| KI-04 | EdgeOne 环境变量缺失，或修改变量后没有触发新部署 | 本地可用但线上认证、AI 或语音不可用 | 以 `.env.example` 的键名逐项核验；当前变量对所有环境生效，但变更只进入后续部署 |

## 产品未闭环项（勿误判为语音服务故障）

| ID | 现象 | 对应 |
|----|------|------|
| KI-10 | `/voice` 的 MiMo ASR/TTS 已接通，但 `intentHandlers` 动作分发仍未挂载 | TD-11 |
| KI-11 | Elder 首页 SOS 已能发起应用内请求，但真实电话、短信或推送通道未接 | TD-10 |
| KI-12 | Realtime / offline 基础设施未挂载 | TD-12 |
| KI-13 | `PlanForm` 无页面路由 | TD-13 |
| KI-14 | 健康广播生成与鉴权播放已接通，但当前没有 Tab 入口 | 功能详解 |
| KI-15 | 首页天气、位置和状态等仍有硬编码文案 | 功能详解 |

## Android 在线壳约束

| ID | 约束 | 说明 |
|----|------|------|
| KI-20 | Release 固定加载 `https://sangzicare.husteread.com` | 正式 URL 已写入 Release 资源；Debug 才使用 `127.0.0.1:7742` |
| KI-21 | 不存在业务 JSBridge 兜底 | 旧 `lib/jsbridge.ts` 已移除；录音走 `getUserMedia`，ASR/TTS 走同源 Next API 与服务端 MiMo |
| KI-22 | APK 必须在站点部署验收后重建 | 仅交付与线上目标提交一致、工作树干净且签名校验通过的 Release APK |

## 数据与权限

| ID | 现象 | 对应 |
|----|------|------|
| KI-30 | 客户端仍保留旧 anon 键名回退；服务端目标为 publishable / secret 新密钥 | TD-03 |
| KI-31 | 家属跨用户读取健康数据的绑定与权限门控仍需收紧 | TD-04 |
| KI-32 | 紧急通知权限存在布尔列与 `permissions` JSONB 两套读取方式 | TD-04 |

## 回归判定

- `npm test`、`npm run lint`、`npm run tsc`、`npm run build` 是提交与部署前的基础门禁。
- ASR/TTS 的云端主链路已经统一为 MiMo；若真实转写或合成失败，应检查鉴权、区域/Base URL、额度、网络与 EdgeOne 环境变量，不得再按“Mock 已知问题”跳过。
- P0 路径（登录、健康、用药、消息、绑定）失败且未命中本表的上线前置条件时，按回归处理并修复。
