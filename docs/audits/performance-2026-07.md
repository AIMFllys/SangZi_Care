# 移动端性能与 EdgeOne 生产预算审计（2026-07）

> 审计日期：2026-07-13—2026-07-14
> 当前实现：Next.js 16.2.10 全栈 App Router
> 项目构建门禁最低运行时：Node.js 22.13.0；EdgeOne 生产运行时固定为官方预装的 Node.js 22.17.1

## 结论

当前生产构建通过仓库内的静态资源与 EdgeOne 单文件预算。Tailwind 扫描范围收窄并完成本轮布局修复后，构建 CSS 从 `170,543 B` 降至 `120,095 B`，减少 `50,448 B`（约 `29.6%`）；最终静态 JavaScript 为 `937,600 B`。构建仍输出 `.next`，没有启用静态导出。

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

- Vitest：81 个测试文件通过，831 项通过；1 个付费 MiMo 实时测试默认跳过。
- 付费 MiMo 本地实时测试：TTS → ASR 1 项通过；密钥未输出。
- ESLint：退出码 0，无 error。
- TypeScript：`tsc --noEmit` 退出码 0。
- Next.js 16.2.10：生产构建退出码 0；`postbuild` 预算检查通过。
- 严格 UTF-8、`git diff --check` 和 staged secret 扫描均通过。

## 2026-07-14 生产移动端与认证证据

- GitHub `main`、本地源码与 EdgeOne `/api/ping` 均为 `80a657fd826e15a07d050b4da2553061a98fdad5`。
- 公网探针返回 `Strict-Transport-Security: max-age=31536000`；浏览器缓存头为 `public,max-age=0,must-revalidate`，同时带 `Eo-Cdn-Cache-Control: no-store, durable`，连续请求为 `Cache Miss`。
- 在真实生产会话的 `390 × 844` 视口审计 `/`、`/health`、`/medicine`、`/messages`、`/radio`、`/settings`：文档宽度均为 `390px`，无横向溢出、无小于 `44px` 的可见触控目标，页面根节点不产生多余滚动。
- 六个主页面的底栏均固定在 `y=780—844`；5 个导航项的上下边界完全一致，中间“功能”项不再凸出。`/voice` 是有明确返回入口的沉浸式会话页，刻意不重复主底栏，全部核心控制仍在一屏内。
- 登录会话重载后 `/api/v1/users/me` 返回 200 并进入首页；退出登录后稳定停留 `/login`。测试随后仅在同源页面内恢复原会话，再次进入首页时 `/users/me` 仍为 200。

## Android Release 候选证据

当前候选只证明 Android 壳与已部署网页可用；审计文档最终提交会改变 revision，因此它不是最终交付包。

- 源码与部署 revision：`80a657fd826e15a07d050b4da2553061a98fdad5`
- APK：`sangzi-smart-care-1.0.0-1-release.apk`，`767,103 B`
- APK SHA-256：`6e6b9f8b061aa123314fd011255f6c3b3a0334ba61adf26342c9d5ded0432316`
- 签名证书 SHA-256：`e9bc0b50958cfb383721f5cf37072ea688c96b1dc4a0b2f77f3fe36e613330ef`
- 正式签名、Release lint、单元测试、R8 与安装均通过；Android 15 模拟器冷启动后约 `7.85s` 出现完整登录内容，没有 FATAL、TLS 或主文档网络错误。
- 清空壳数据并断网冷启动时出现原生“网络连接暂时不可用”重试页；恢复公网后点击“重新加载”，同一 Activity 成功回到完整登录页。

## 尚需生产环境证明的项目

不把外部状态伪装成成功。当前尚未完成的是：

- EdgeOne 生产 `POST /api/v1/voice/tts` 仍返回 `503` 与安全错误 `MiMo 语音服务未配置`；同一密钥的本地付费实时回环已通过，故当前根因是 EdgeOne 尚未注入服务端变量 `MIMO_API_KEY`，不是模型、音频格式或代码链路失败。
- EdgeOne 增加该变量并重新部署后，必须通过线上同源路由完成一次非敏感 MiMo TTS → ASR 冒烟。
- 生产语音通过、最终审计提交部署后，必须从该最终 revision 再次构建、安装并记录 Release APK 哈希；物理手机上的真实麦克风授权仍是最终设备验收项。

这些外部验证完成前，不能仅凭本地构建或候选 APK 宣称生产语音与 APK 端到端验收完成。
