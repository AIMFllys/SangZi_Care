# EdgeOne Pages 生产部署

> Updated: 2026-07-13
>
> 正式站点：`https://sangzicare.husteread.com`
>
> 官方参考：[Next.js 框架指南](https://pages.edgeone.ai/zh/document/framework-nextjs) · [edgeone.json 配置](https://edgeone.ai/document/162316940299157504)

## 部署契约

- 仓库是**全栈 Next.js**，禁止配置 `output: 'export'`。
- EdgeOne 安装 / 构建命令为 `npm ci` / `npm run build`，产物目录为 **`.next`**，不是 `out/`。
- 浏览器、Android Release 壳与业务 API 使用同一正式源；生产环境保持 `NEXT_PUBLIC_API_BASE_URL` 未设置或为空，由页面访问同源 `/api/**`。
- redirects / rewrites 写在根目录 [edgeone.json](../../edgeone.json)，不要写进 `next.config.ts`。
- `/api/ping` 在应用层和 EdgeOne 层都必须禁用缓存：Route Handler 返回 `Cache-Control: no-store`，`edgeone.json` 同时配置响应头和 `cacheTtl: 0`，避免平台默认缓存策略覆盖部署 revision 探针。
- EdgeOne 必须监听实际发布分支。每次上线都要记录目标提交 SHA，不能仅把未连接的功能分支推到远端后宣称已经部署。

## 1. Supabase 上线前置

部署应用代码前先完成以下两项；它们不是可跳过的可选配置。

1. 在**生产 Supabase 项目**应用 [`20260713230000_auth_challenges.sql`](../../supabase/migrations/20260713230000_auth_challenges.sql)，确认 `oc_auth_challenges` 与六个 `oc_auth_challenge_*` SECURITY DEFINER RPC 存在且只向 `service_role` 授予执行权。未应用时 CAPTCHA / OTP 会返回 503。
2. 创建 `SUPABASE_VOICE_BUCKET` 指向的 Storage bucket，并确认它存在且 `public === false`。消息语音、健康广播在上传和签名前都会检查该属性；缺失、公开或无权限时会返回 503。

不要把“migration 文件已经提交”当作“生产数据库已经迁移”，也不要在代码中自动创建或自动改公开 bucket。

## 2. EdgeOne 环境变量

本地 `.env.local` 与 EdgeOne 控制台只共享**键名和用途**，不共享文件；真实生产值直接配置在 EdgeOne 项目设置中，禁止提交 `.env*` 或把本地文件上传到仓库。按 EdgeOne 当前构建指南，这些变量对所有环境生效；变量变更不会回写旧部署，修改后必须触发新部署。

完整键说明见 [env-config.md](./env-config.md) 与 [.env.example](../../.env.example)。生产功能至少逐项核验：

| 能力 | 键 | 要求 |
|------|----|------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 生产项目客户端配置 |
| 服务端数据 | `SUPABASE_SECRET_KEY` | 仅服务端；不得加 `NEXT_PUBLIC_` |
| 私有语音 | `SUPABASE_VOICE_BUCKET` | 指向上一步已核验的 private bucket |
| 登录签名 | `JWT_SECRET` | 仅服务端；同时用于认证挑战摘要派生 |
| 邮件 OTP | `SMTP_USER`、`SMTP_PASS` | 仅服务端；`SMTP_HOST`、`SMTP_PORT`、`SMTP_FROM_NAME` 按服务商需要配置 |
| MiMo 语音 | `MIMO_API_KEY` | 仅服务端；Base URL、模型与 Key 必须属于同一区域 / 计费类型 |
| AI 文本 | `VOLCANO_ARK_API_KEY`、`VOLCANO_ARK_MODEL_ENDPOINT` | 仅服务端；需要自定义网关时再配置 Base URL |
| 正式源标记 | `NEXT_PUBLIC_APP_URL` | 可选一致性标记；当前运行时代码不读取，若配置则使用正式 URL |
| 同源 API | `NEXT_PUBLIC_API_BASE_URL` | 生产留空或不设置，禁止指向已删除的 Python 服务 |

预览与正式部署会读取同一组项目变量，因此测试值不得长期留在项目设置中。用户公开过、进入日志或聊天记录的密钥应先轮换，再写入控制台并触发新部署。

## 3. Git 自动部署流程

1. 确认 EdgeOne 项目连接的仓库、生产分支和正式域名。
2. 在本地执行 `git status --short`，区分本次变更与他人未提交变更；不得提交 `.env*`、keystore、APK 或真实密钥。
3. 确认 `edgeone.json` 使用官方预装的 Node.js `22.17.1`，再依次运行 `npm ci`、`npm test`、`npm run lint`、`npm run tsc`、`npm run build`。
4. 确认 `next.config.ts` 没有 `output: 'export'`，构建产物仍为 `.next`。
5. 提交并推送 EdgeOne 实际监听的生产分支，记录 `git rev-parse HEAD`。
6. 等待 EdgeOne 将**该提交**标记为部署成功，并确认正式站点 `/api/ping` 返回的 `revision` 与 `git rev-parse HEAD` 完全一致、最终响应头仍含 `Cache-Control: no-store`；任一不满足都不得继续生产验收。

## 4. 线上验收

对 `https://sangzicare.husteread.com` 至少验证：

- DNS / TLS、首页与 `GET /api/ping` 正常；探针响应为 `no-store`，40 位 `revision` 等于目标提交。
- CAPTCHA → SMTP OTP → 登录 → 刷新令牌主路径可用，错误响应不泄露邮箱、验证码或服务端异常正文。
- `/voice` 真实录音可完成 MiMo ASR，回复可完成 MiMo MP3 TTS；不要只测文本聊天。
- 消息语音可上传、列表不暴露 Storage 内部路径、鉴权播放可用。
- 广播可生成并通过短期签名 URL 播放；私有响应保持 `private, no-store`。
- AI 文本回复不是“未配置”占位结果。
- 手机窄屏、底部导航、安全区和返回导航无明显回归。

部署失败时先检查目标提交、变量是否已进入本次新部署、Supabase migration 和 private bucket，再看应用日志；日志中不得打印密钥、OTP、原始音频或上游敏感响应。

## 5. APK 顺序

只有在线站点通过上述验收后，才按 [Android 在线壳说明](../../android/README.md) 重建 Release APK。APK 必须来自与线上目标提交一致的干净工作树；构建脚本会在 Gradle 启动前检查 tracked / untracked 文件，并请求正式 `/api/ping` 比较线上 `revision` 与本地 `HEAD`。任一检查失败都会在编译前终止。

## 其他注意事项

- 单文件 ≤ 25MB；大媒体走对象存储 / CDN，勿塞进 `public/`。
- Android / 浏览器只访问正式 HTTPS 域名；Release 不允许明文流量。
- CLI 可用于已授权环境的诊断或发布，但 Git 连接仍是本项目默认生产流程。

## 相关文档

- [环境变量](./env-config.md)
- [目标架构](../designs/target-architecture.md)
- [Android 在线壳](../../android/README.md)
