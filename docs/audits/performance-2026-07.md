# 移动端性能与 EdgeOne 生产预算审计（2026-07）

> 审计日期：2026-07-13
> 当前实现：Next.js 16.2.10 全栈 App Router
> 项目构建门禁最低运行时：Node.js 22.13.0；EdgeOne 生产运行时固定为官方预装的 Node.js 22.17.1

## 结论

当前生产构建通过仓库内的静态资源与 EdgeOne 单文件预算。Tailwind 扫描范围收窄并完成本轮布局修复后，构建 CSS 从 `170,543 B` 降至 `119,960 B`，减少 `50,583 B`（约 `29.7%`）；最终静态 JavaScript 为 `935,345 B`。构建仍输出 `.next`，没有启用静态导出。

## 可复现预算

`npm run build` 的 `postbuild` 会自动执行 [`scripts/check-build-budget.mjs`](../../scripts/check-build-budget.mjs)，失败即阻断构建。

| 指标 | 预算 | 2026-07-13 实测 | 结果 |
|---|---:|---:|---|
| CSS 单文件 | ≤ 100 KiB | ≤ 预算 | 通过 |
| CSS 总量 | ≤ 200 KiB | 119,960 B（6 个文件） | 通过 |
| JS 单文件 | ≤ 250 KiB | ≤ 预算 | 通过 |
| JS 总量 | ≤ 1,100 KiB | 935,345 B（31 个文件） | 通过 |
| EdgeOne 单文件 | ≤ 25 MiB | 最大 1,219,268 B | 通过 |
| 静态文件合计 | 观察值 | 1,055,305 B（37 个文件） | 通过 |
| 部署文件数量 | 观察值 | 1,023 | 已检查 |

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

- Vitest：77 个测试文件通过，808 项通过；1 个付费 MiMo 实时测试默认跳过。
- ESLint：退出码 0；保留 5 个既有 warning，无 error。
- TypeScript：`tsc --noEmit` 退出码 0。
- Next.js 16.2.10：生产构建退出码 0；`postbuild` 预算检查通过。
- 严格 UTF-8、`git diff --check` 和 staged secret 扫描均通过。

## 尚需生产环境证明的项目

本审计只证明可复现的本地构建与预算，不把外部状态伪装成成功。以下项目必须在推送后单独记录：

- EdgeOne 实际构建并运行精确 Git commit（Node 22.17.1）。
- `sangzicare.husteread.com` 的公共 DNS、TLS、`/api/ping` 与安全/缓存响应头；探针的 `revision` 必须等于目标 Git SHA。
- EdgeOne 控制台已配置的 Supabase、SMTP 与 MiMo 服务端变量。
- 通过线上同源路由完成一次非敏感 MiMo TTS → ASR 冒烟。
- Android Release WebView 的启动、网络恢复和麦克风链路。

这些外部验证完成前，不能仅凭本地构建宣称生产发布或 APK 端到端验收完成。
