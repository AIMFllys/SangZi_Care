# 桑梓智护深度迭代设计规格

> 创建日期：2026-07-13
> 状态：已接受（用户要求自主分析并推进）
> 适用范围：全站移动端 UI、Xiaomi MiMo 语音、性能与 EdgeOne、Android 在线壳

## 1. 目标

本轮把现有“能渲染的移动网页”收敛成可长期维护的手机应用：

1. 一级页面在常见手机视口内完整展示核心操作，详情和长内容只滚动必要区域。
2. 底部导航固定、安全区正确、五项同一基线，中间项不再上凸。
3. 所有页面使用统一壳层、页边距、按钮尺度和响应式策略，消除重叠、留白与横向裁切。
4. 使用 Xiaomi MiMo V2.5 完成真实 ASR/TTS，覆盖语音助手、健康录入、聊天和播报入口。
5. 在 EdgeOne 全栈 Next.js 约束内优化体积、渲染、媒体和缓存，并验证生产部署。
6. 交付指向 `https://sangzicare.husteread.com` 的已签名、可安装 Android WebView APK。

## 2. 审计事实

2026-07-13 使用 390×844 移动视口、假用户与假业务数据审计了 15 个路由。关键测量如下：

| 页面 | 文档高度 | 确定问题 |
|---|---:|---|
| Elder 首页 | 932px | SOS 底部 798px，底栏顶部 772px，重叠 26px |
| 联系人列表 | 932px | 短内容仍比视口多 88px |
| 聊天详情 | 932px | 应用底栏与聊天编辑器并存；默认录音器纵向膨胀 |
| 用药提醒 | 932px | 第二主按钮底部 820px，被底栏覆盖 48px |
| 健康看板 | 963px | “添加新记录”按钮进入底栏区域 |
| 健康录入 | 1212px | 双大按钮、表单和全局底栏形成长页 |
| 广播 | 1112px | 固定播放器与底栏没有统一占位模型 |
| 设置子页 | 932px | 页面重复嵌套 `.device-wrapper` / `.page-content` |
| 沉浸语音页 | 932px | 底栏虽隐藏，仍保留全局 88px padding |

直接根因：

- `.device-wrapper`、`.page-content` 与各页面重复声明 `100dvh`。
- `.page-content` 无条件预留 `tabbar-height + safe-bottom + 16px`。
- TabBar 中央图标与文字被 `translateY(-10px)`，普通项理论内容高度也超过栏高。
- 页面和 `PageHeader` 重复应用 24px 横向 padding。
- 没有宽度、高度、大字体或横屏断点。
- `/family/[id]` TSX 使用的多数 CSS Module 类不存在。
- 云端 ASR/TTS 是静音与固定文本占位，`/voice` 是定时 Mock。
- Android 工程缺构建包装器、图标、签名、WebView 麦克风授权和严格来源限制。

## 3. 方案选择

采用“统一壳层重构 + 逐页精修 + 独立语音迁移”的渐进方案。

未采用：

- 仅补 CSS：会保留重复高度、详情页和安全区的结构性问题。
- 一次性重写全部前端：会把 UI、数据层、语音与 Android 风险混为一个不可审查提交。

## 4. 移动端壳层

### 4.1 三种页面模式

| 模式 | 路由 | 底栏 | 滚动策略 |
|---|---|---|---|
| `tabbed` | `/`、`/messages`、`/medicine`、`/health`、`/settings`、`/radio` | 固定显示 | 主内容区按需滚动 |
| `detail` | `/messages/[id]`、`/medicine/history`、`/health/input`、`/family/[id]`、`/settings/*` | 隐藏 | 页头/编辑器固定，仅正文滚动 |
| `immersive` | `/login`、`/onboarding`、`/voice` | 隐藏 | 页面完整占用安全视口 |

`ClientShell` 依据 pathname 计算模式，并给 `<main>` 写入稳定的模式类。页面不得再嵌套全局设备壳。

### 4.2 高度与安全区

- 应用外壳：`height: 100dvh; overflow: hidden`。
- TabBar 总高度：`64px + env(safe-area-inset-bottom)`；安全区在 64px 内容高度之外。
- `tabbed` 主区高度：`calc(100dvh - 64px - safe-bottom)`。
- `detail` / `immersive` 主区高度：`100dvh`。
- 滚动容器必须使用 `min-height: 0; overflow-y: auto; overscroll-behavior-y: contain`。
- 不用全局底部 padding 模拟固定栏占位。
- 键盘出现时聊天编辑器跟随 visual viewport，不允许页面和消息列表双滚动。

### 4.3 底部导航

- 使用五列等宽 Grid，不使用 `center` 尺寸分支。
- 所有图标使用 24px，图标框 28px，标签 12–13px，单项内容同一垂直基线。
- 当前项仅通过主色、轻背景和可选 3px 顶部短线表达，不改变几何尺寸。
- 单项触控区至少 48×48px；按下反馈只使用 0.98 缩放，不改变布局。
- Family 与 Elder 可保留不同标签和目的地，但共享同一 DOM 和 CSS 几何规则。
- 动画只作用于 `transform`、`opacity` 和颜色，并支持 `prefers-reduced-motion`。

## 5. 视觉与适老化设计

视觉方向为“安静、可信的家庭照护”：老人端保留暖纸色，家属端保留冷蓝色；卡片以高不透明实色为主，毛玻璃只用于固定 chrome。

### 5.1 设计令牌

- `--page-gutter: clamp(16px, 5vw, 24px)`，每层只使用一次。
- 正文最小 17px，主要正文 18–20px；标题用权重和行距建立层级，不把所有标签放大。
- 常规按钮高 48px、主按钮 52–56px；只有紧急操作可使用 60px。
- 卡片圆角 20–24px；控件圆角 14–18px；圆形按钮只用于明确图标动作。
- 提高 Elder 主色深度，使白字和主要交互达到 WCAG AA；装饰橙与文字/按钮橙分离。
- 恢复页面缩放，不设置 `maximumScale: 1` 或 `userScalable: false`。

### 5.2 响应式矩阵

必须验证：

- 320×568、360×640、375×667、390×844、430×932、480×960。
- 横屏 844×390。
- 100%、125%、150% 字体偏好。
- `prefers-reduced-motion`、`prefers-reduced-transparency`、`prefers-contrast: more`。

宽度小于 350px 时：双列操作改为纵向或紧凑分段控件；按钮文字可换行但不截断。高度小于 700px 时：压缩问候、装饰球和卡片间距，保留主操作触控尺寸。

## 6. 页面设计

### 6.1 Elder 首页

- 以问候、时间、语音入口、SOS 为四个层级；删除没有行为的“上滑更多功能”。
- 语音入口使用高度自适应的 132–176px 圆形按钮，不固定 210px 光环。
- SOS 始终位于底栏上方且不重叠；真实触发紧急 API 前保留明确确认/取消状态。

### 6.2 Family 首页

- 老人选择器横向滚动；摘要卡两列，在小宽度下压缩文字而不压缩触控区。
- 趋势卡占剩余空间；短屏只展示最近摘要，详细趋势进入健康页。

### 6.3 聊天

- 详情模式隐藏应用 TabBar。
- 结构固定为：56–64px 页头、`flex:1` 消息滚动区、56–64px 编辑器。
- 默认文字编辑器；语音切换后显示等高“按住说话”控件。
- 录音中显示临时 HUD，包括计时、取消手势和上传/转写状态；不展开 88px 圆按钮加双按钮表单。
- 气泡最大宽度 78%，不设 200px 最小宽度；真实录音优先播放 `audio_url`，旧消息无音频时才 TTS 朗读转写。

### 6.4 用药

- 常规列表页使用 TabBar；强提醒状态采用页面内紧凑主卡，不让两个 71px 按钮进入底栏区域。
- 一屏展示当前一项药物和主操作；多项药物进入可滚动时间线。
- 日期切换、延后和 SOS 必须有真实行为或移除误导控件。

### 6.5 健康与设置

- 健康看板的记录卡使用紧凑网格；新增记录按钮固定在内容区底部而非视口底栏上。
- 健康录入的“手动/语音”改为紧凑分段控件；可选字段折叠，保存操作 sticky。
- 设置页删除重复壳层；子页统一 detail header。
- `/family/[id]` 重建与 TSX 一致的完整 CSS，提供加载、空、错误、权限受限四种状态。

## 7. Xiaomi MiMo 语音架构

### 7.1 服务端边界

所有 MiMo 调用只发生在 Next Route Handlers / `lib/server`：

```text
浏览器 / Android WebView
  → 同源已鉴权 `/api/v1/voice/transcribe` 或 `/tts`
    → MiMo client（服务端 `MIMO_API_KEY`）
      → `https://api.xiaomimimo.com/v1/chat/completions`
```

保留现有 `VOLCANO_ARK_*` 供 AI chat/intent/summary 使用；只迁移旧语音占位配置。

### 7.2 ASR

- 模型：`mimo-v2.5-asr`。
- 客户端通过 Web Audio 采集单声道 PCM 并编码 WAV；不把 WebM/Opus直接发给 MiMo。
- 路由接受 WAV/MP3，校验 MIME、扩展名、文件头、空文件与最大 5MB。
- 服务端以 data URL/Base64 放入 `input_audio`，`asr_options.language = 'zh'`。
- 上游超时 45 秒；用户取消或导航离开时使用 AbortController。
- `stopListening()` 返回最终 `{ transcript, audioBlob, durationMs }`，调用方必须等待转写完成。

### 7.3 TTS

- 模型：`mimo-v2.5-tts`；首版非流式 MP3。
- 用户消息描述“温暖、清晰、稍慢的普通话”，目标文字放在 assistant 消息。
- 默认中文音色显式设置为“冰糖”，允许通过服务端白名单更换。
- 个性化精确语速由客户端 `audio.playbackRate` 应用用户的 `voice_speed`。
- 单次文本限制 1000 个 Unicode 字符；超长内容按句切分、顺序播放。
- 上游超时 45 秒；音频响应 `Cache-Control: no-store`。

### 7.4 错误与隐私

- 未配置 key 返回 503，不再返回静音或固定文本伪装成功。
- 400/401/403/421 不重试；网络错误、429、500、503 最多有限重试并退避。
- 日志只记录 request ID、状态码、耗时和字节数；不记录文本、音频、Authorization 或 key。
- 按用户做短时限流，避免耗尽 100 RPM 配额。

### 7.5 消费端

- `/voice`：真实 ASR → AI chat/intent → MiMo TTS 状态机。
- 健康录入：语音转写后解析并允许用户确认，再保存结构化数据。
- 聊天：保留转写和原始录音；若本轮对象存储配置不可用，发送前必须明确提示，不能伪装已保存语音。
- 用药：提醒通过 MiMo TTS 播报，并可停止。
- 广播：生成的音频需要保存 URL 后才算成功；不可生成后丢弃字节。

## 8. 性能与 EdgeOne

- 保持全栈 Next.js，绝不添加 `output: 'export'`；输出目录保持 `.next`。
- MiMo 原始请求/响应控制在 EdgeOne 6MB body 上限以内；函数总时限 60 秒，上游预留 10–15 秒收尾。
- 大面积滚动卡片移除 `backdrop-filter`；模糊仅保留顶部栏、底栏和必要浮层。
- 路由级组件按需加载；不在首页预加载语音波形、广播播放器或长表单。
- 图片使用 Next/Image 可用能力或明确本地矢量资源；不提交音视频测试产物。
- 为静态 chunk 保留 immutable 缓存；用户健康、聊天和 TTS 响应 `no-store`。
- 添加明确 `test`、语音冒烟和 UI 审计命令；生产验证使用 Node 22。
- `.env*` 默认忽略，仅放行 `.env.example`；密钥只写 `.env.local` 和 EdgeOne 控制台。

## 9. Android 在线壳

- `app_base_url` 固定为 `https://sangzicare.husteread.com`，debug variant 才允许本地 HTTP。
- 补齐 Gradle Wrapper、Android SDK 配置说明和自适应矢量 launcher icon。
- Release 禁止 cleartext、mixed content、文件访问和内容访问。
- WebView 只允许目标域名内部导航；外部 HTTPS 链接交给系统浏览器。
- `WebChromeClient.onPermissionRequest` 只对精确生产 origin 授予 `RESOURCE_AUDIO_CAPTURE`，并先获取 Android `RECORD_AUDIO` 权限。
- MiMo 统一走网页录音和服务端 API；删除不可用的 Native ASR/TTS 优先级。必要的电话/存储桥统一命名并最小化暴露面。
- Release 使用仓库外 keystore；`.gitignore` 覆盖 `*.jks`、`*.keystore`、`keystore.properties`。
- APK 验证必须包括：签名、包名、版本、安装、升级、启动、登录保持、麦克风授权、真实 ASR/TTS、返回键与断网重试。

## 10. 测试与验收

### 10.1 自动化门禁

- `npm run lint`：退出码 0，清理本轮触及文件警告。
- `npm run tsc`：退出码 0。
- `npm test` / `npx vitest run`：全部通过，无新增 `act(...)` 警告。
- `npm run build`：Node 22 下退出码 0。
- `next.config.ts` 不含 `output: 'export'`。
- Git 不跟踪 `.env*`、keystore、真实 key、音视频和 APK。

### 10.2 UI 验收

- 对全部 16 个页面状态在响应式矩阵逐页截图。
- 所有短页 `scrollHeight <= clientHeight + 1`；允许滚动页只有一个纵向滚动容器。
- 可见按钮矩形不越出视口或被固定 chrome 覆盖。
- TabBar 五项 top/bottom 基线相同，触控区至少 48px。
- 聊天键盘打开后页头、最后消息与编辑器仍可见。

### 10.3 语音验收

- 单元测试覆盖 payload、Schema、Base64、超时、重试和错误映射。
- 路由测试覆盖鉴权、WAV/MP3、伪造 MIME、5MB 边界、缺 key。
- Hook 测试覆盖权限拒绝、停止等待、重复点击、取消和 URL 回收。
- 计费型真实冒烟：固定非敏感中文 TTS → 将生成 MP3 输入 ASR → 断言返回关键词。
- EdgeOne 部署后再次运行真实 TTS/ASR，验证广州区域出站连接。

### 10.4 生产与 APK 验收

- `https://sangzicare.husteread.com/api/ping` 返回 2xx。
- DNS、TLS、主要页面、登录与同源 API 可用。
- `apksigner verify --verbose --print-certs` 通过。
- `aapt dump badging` 的包名、版本和启动 Activity 正确。
- 真机或可用模拟器成功安装并完成语音链路。

## 11. 提交阶段

每阶段独立提交：

1. 设计规格与实施计划。
2. 整理并提交现有 `oc_` 表名前缀改动。
3. AppShell、TabBar、设计令牌与共享组件。
4. 首页、消息、聊天、用药、健康、设置、广播和详情页。
5. MiMo 服务端、录音编码、Hooks 与各消费端。
6. 性能、EdgeOne、文档与生产配置。
7. Android 在线壳、签名配置与 APK 验证。
8. 全量回归修复与最终推送。

任何阶段失败时只修复本阶段，不跨阶段混合提交。
