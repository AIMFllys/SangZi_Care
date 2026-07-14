# 移动端性能与 EdgeOne 生产预算审计（2026-07）

> 审计日期：2026-07-13—2026-07-14
> 当前实现：Next.js 16.2.10 全栈 App Router
> 项目构建门禁最低运行时：Node.js 22.13.0；EdgeOne 生产运行时固定为官方预装的 Node.js 22.17.1

## 结论

当前生产构建通过仓库内的静态资源与 EdgeOne 单文件预算。Tailwind 扫描范围收窄并完成本轮布局修复后，构建 CSS 从 `170,543 B` 降至 `120,095 B`，减少 `50,448 B`（约 `29.6%`）；最终静态 JavaScript 为 `937,600 B`。构建仍输出 `.next`，没有启用静态导出。EdgeOne 注入服务端 `MIMO_API_KEY` 并重新部署后，生产同源 TTS → ASR 真实回环也已通过。

## 可复现预算

`npm run build` 的 `postbuild` 会自动执行 [`scripts/check-build-budget.mjs`](../../scripts/check-build-budget.mjs)，失败即阻断构建。

| 指标 | 预算 | 2026-07-14 实测 | 结果 |
|---|---:|---:|---|
| CSS 单文件 | ≤ 100 KiB | ≤ 预算 | 通过 |
| CSS 总量 | ≤ 200 KiB | 120,095 B（6 个文件） | 通过 |
| JS 单文件 | ≤ 250 KiB | ≤ 预算 | 通过 |
| JS 总量 | ≤ 1,100 KiB | 937,600 B（31 个文件） | 通过 |
| EdgeOne 单文件 | ≤ 25 MiB | 最大 1,219,268 B | 通过 |
| 静态文件合计 | 观察值 | 1,057,695 B（37 个文件） | 通过 |
| 部署文件数量 | 观察值 | 1,003 | 已检查 |

最大部署文件是服务端 sourcemap，约 1.22 MB，距离 EdgeOne 25 MiB 单文件上限仍有充足余量。

## 本轮优化

- 首页按 Elder / Family 角色动态加载，只请求当前角色视图，避免两个首页一起进入初始路由图。
- 首页时钟按分钟对齐更新，并在页面进入后台时暂停，减少无意义渲染。
- Tailwind v4 仅扫描 `app/` 与 `components/`，不再扫描文档、测试、生成物和无关源码。
- 大面积滚动卡片改用高不透明或实色表面；模糊仅保留固定导航等必要 chrome，并提供减少透明度降级。
- 广播推荐的私有对象签名由最多 100 次 Storage 调用收敛为固定 2 次；客户端隔离过期 URL、请求竞态和播放意图。
- 语音与 AI 请求具备流式读取上限和上游截止时间：TTS JSON 8 KiB、ASR multipart 6 MiB / 音频 5 MiB、聊天 64 KiB、意图 8 KiB；MiMo 与豆包均在 EdgeOne 60 秒函数时限前结束。
- AuthProvider 复用全局会话，路由切换不再重复调用 `/users/me`。
- 生产依赖审计在本轮处理后为 0 个已知漏洞；依赖安装保持 `npm ci` 和仓库 lockfile。

## EdgeOne 生产契约

[`edgeone.json`](../../edgeone.json) 当前配置：

- 安装：`npm ci`
- 构建：`npm run build`
- 输出：`.next`
- Node.js：`22.17.1`；该版本属于 EdgeOne 2026-07 [构建指南](https://pages.edgeone.ai/zh/document/build-guide)列出的预装 Node 22 版本（`22.11.0` / `22.17.1`），符合 [edgeone.json 文档](https://pages.edgeone.ai/zh/document/edgeone-json)对预装版本的要求
- 函数区域：`ap-guangzhou`
- 函数最大时长：60 秒
- `/_next/static/*`：`public, max-age=31536000, immutable`

[`next.config.ts`](../../next.config.ts) 只配置应用安全响应头和图片兼容项；没有 `output: 'export'`，也没有 redirects / rewrites。

## 最新组合门禁证据

在 UI、MiMo、广播、认证与性能提交组合后执行：

- Vitest：81 个测试文件通过，835 项通过；1 个付费 MiMo 实时测试默认跳过。
- 付费 MiMo 本地实时测试：TTS → ASR 1 项通过；密钥未输出。
- ESLint：退出码 0，无 error。
- TypeScript：`tsc --noEmit` 退出码 0。
- Next.js 16.2.10：生产构建退出码 0；`postbuild` 预算检查通过。
- 严格 UTF-8、`git diff --check` 和 staged secret 扫描均通过。

## 2026-07-14 生产移动端与认证证据

- UI 与认证审计采样 revision 为 `80a657fd826e15a07d050b4da2553061a98fdad5`；经 `git diff --name-status` 复核，从该 revision 到语音验证基线 `df0adeb0037134e9549534f1d3a5f76559e2d349` 的唯一文件差异是本审计文档，Android 与 Web 运行时输入没有改变。
- 公网探针返回 `Strict-Transport-Security: max-age=31536000`；浏览器缓存头为 `public,max-age=0,must-revalidate`，同时带 `Eo-Cdn-Cache-Control: no-store, durable`，连续请求为 `Cache Miss`。
- 在真实生产会话的 `390 × 844` 视口审计 `/`、`/health`、`/medicine`、`/messages`、`/radio`、`/settings`：文档宽度均为 `390px`，无横向溢出、无小于 `44px` 的可见触控目标，页面根节点不产生多余滚动。
- 六个主页面的底栏均固定在 `y=780—844`；5 个导航项的上下边界完全一致，中间“功能”项不再凸出。`/voice` 是有明确返回入口的沉浸式会话页，刻意不重复主底栏，全部核心控制仍在一屏内。
- 登录会话重载后 `/api/v1/users/me` 返回 200 并进入首页；退出登录后稳定停留 `/login`。测试随后仅在同源页面内恢复原会话，再次进入首页时 `/users/me` 仍为 200。
- 最终连续直达路由验收发现：整页导航可能取消上一文档仍在途的 `/users/me`，旧实现会把该临时异常误判为凭证失效并删除会话。现已收紧为仅在明确 401 时清除凭证；导航取消、直接网络错误和非 401 上游失败会保留可恢复会话。refresh 传输也区分“凭证无效”和“服务暂不可用”，避免把 refresh 的 5xx / 网络失败重新包装成原始 401。对应回归测试先失败后修复通过，并保留“401 必须退出”的反向断言。

## 2026-07-14 生产 MiMo 与 Supabase 证据

- EdgeOne `/api/ping` 已切换到部署 revision `df0adeb0037134e9549534f1d3a5f76559e2d349` 后才开始语音测试，排除了命中旧实例的可能。
- 在真实生产登录会话中，`POST /api/v1/voice/tts` 返回 200 和 `audio/mpeg`，生成 `23,928 B` MP3；请求 ID 为 `80370aff-d24a-4bab-9f13-66624ec2f59f`。
- 将上述 MP3 原样作为 `file` 提交给 `POST /api/v1/voice/transcribe`，返回 200；请求 ID 为 `54c1959f-50b1-4a7c-ab79-c3d731d88dc7`。
- 测试短语为“桑梓智护语音服务生产回环测试。”，ASR 返回“桑子智护语音服务生产回环测试。”；专名同音字存在单字偏差，但音频生成、鉴权、上传、格式校验、MiMo ASR 和响应链路全部成功。测试过程没有输出访问令牌或 MiMo 密钥。
- 通过 Supabase MCP 复核：`voice-audio` bucket 为 private，单对象上限 5 MiB，仅允许 `audio/wav` / `audio/mpeg`，审计时无遗留对象；6 个 `oc_auth_challenge_*` RPC 仅授予 `postgres` / `service_role`，客户端角色没有挑战表权限；没有测试样式账号或未过期 challenge。
- 同一 Supabase 项目还承载其他应用的 16 张未启用 RLS 的表。它们不属于桑梓智护本轮授权范围，本轮没有擅自修改；共享项目管理员应单独确认这些表是否应隔离或启用 RLS。

## Android Release 预验收证据

当前候选证明 Android 壳、正式签名流程与已部署网页可用。本次审计更新提交并部署后，以该部署 revision 作为一次性的 Release 构建基线，重新构建并安装 APK。最终 APK 哈希仅写入交付记录，不再修改本文件；审计记录提交本身不触发下一轮 APK 重建。

- 源码与部署 revision：`80a657fd826e15a07d050b4da2553061a98fdad5`
- APK：`sangzi-smart-care-1.0.0-1-release.apk`，`767,103 B`
- APK SHA-256：`6e6b9f8b061aa123314fd011255f6c3b3a0334ba61adf26342c9d5ded0432316`
- 签名证书 SHA-256：`e9bc0b50958cfb383721f5cf37072ea688c96b1dc4a0b2f77f3fe36e613330ef`
- 正式签名、Release lint、单元测试、R8 与安装均通过；Android 15 模拟器冷启动后约 `7.85s` 出现完整登录内容，没有 FATAL、TLS 或主文档网络错误。
- 清空壳数据并断网冷启动时出现原生“网络连接暂时不可用”重试页；恢复公网后点击“重新加载”，同一 Activity 成功回到完整登录页。

## 最终设备验收边界

生产同源 MiMo TTS → ASR 已完成。仍需在交付阶段完成或由真实设备持有人确认的是：

- 从上述一次性 Release 构建基线重新构建、安装并记录 APK 哈希。
- Android 模拟器可验证安装、冷启动、联网与断网恢复；物理手机上的真实麦克风采集、系统授权弹窗和扬声器听感仍须在目标设备上做一次人工验收。

完成最终 APK 构建与模拟器复测前，不能把上述预验收候选当作最终交付包。
