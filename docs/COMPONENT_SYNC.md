# 智护银龄组件闭环规范

以后先改网页端 TypeScript 组件，再按本规范把同一视觉与交互同步到原生 Android。版本号两边保持一致。

完整清单与待同步表见仓库外的本地总规范，或直接以本文件为准。

## 1. 双端职责

| 端 | 目录 | 职责 |
|---|---|---|
| 网页 / Web 壳 | 本仓库 `app/`、`components/`、`android/` | **功能与视觉真相**。改这里会自动部署到 `https://sangzicare.husteread.com`。 |
| 原生 Android | 本地 `app-kotlin/` | 跟网页，不反过来改网页迁就原生。 |
| 官网下载 | `elderstech` 仓库 | 同时提供两类 APK 和在线预览。 |

两类正式包共用同一 `versionName` / `versionCode`：

- Web 壳 APK：`android/` → 分发名 `elderstech.apk`
- 原生 APK：`app-kotlin` → 分发名 `android-elderstech.apk`
- 当前统一版本：`2.0.0` / `versionCode 5`

## 2. 改网页组件的步骤

1. 只改本仓库的页面、组件、CSS 和 `lib`。
2. 问卷计分、SOS `request_id`、Token 存储、API 契约保持不动，除非任务明确要求。
3. 跑相关 Vitest。时间、底栏、页头、确认弹窗属于跨页组件，改完至少覆盖：
   - `lib/__tests__/clock.test.ts`
   - `components/layout/__tests__/TabBar.test.tsx`
   - `components/layout/__tests__/PageHeader.test.tsx`
   - `lib/__tests__/versionContract.test.ts`
4. 合并后等待网页自动部署。用 `/api/ping` 核对 `version` 与 revision。
5. **把这次改动写进第 5 节「待同步清单」**，再改 `app-kotlin/`。

## 3. 同步到原生的步骤

对照网页 CSS / DOM，而不是对照 Material 默认组件。

| 网页 | 原生必须跟上的位置 |
|---|---|
| `styles/globals.css` 与主题 CSS | `designsystem/Tokens.kt`、`TOKEN_MAP.md` |
| `components/ui/*` | `designsystem/components/*` |
| `components/layout/TabBar*` | `SzTabBar` + `NativeNavigation` |
| `components/layout/PageHeader*` | `SzPageHeader` |
| `components/ui/ConfirmDialog*` | `SzConfirmDialog`（必须用 `Dialog` 窗口） |
| `lib/clock.ts` | `core/time/ShanghaiClock.kt` |
| `android/.../ic_launcher_foreground.xml` | 原生同样的自适应图标 |

硬约定：

- `1rem = 16.dp`
- 时间与问候使用 `Asia/Shanghai`，首页时钟至少 30 秒刷新
- 底栏内容高 64，安全区另加，不能把标签裁进导航条
- 页头内容高 64，`safe-top` 加在页头容器上，不要加在标题文字上
- 确认弹窗必须高于底栏，按钮可点
- 启动图标与本仓库 Android 壳品牌图标保持同一套

## 4. 发布

1. 网页已部署且 `/api/ping` 的 `version` 等于本次 `APP_VERSION`
2. 打两个 Release APK，文件名与 CDN 一致：
   - Web 壳：`https://husteread.com/storage/files/elderstech/app/elderstech.apk`
   - 原生：`https://husteread.com/storage/files/elderstech/app/android-elderstech.apk`
3. GitHub Release 挂上这两个 APK，标题版本号与 `versionName` 相同
4. 官网下载页只改链接与文案。在线预览固定为 `https://sangzicare.husteread.com`

## 5. 待同步清单

| 日期 | 网页改动 | 原生状态 |
|---|---|---|
| 2026-09-11 | 首页上海时区时钟、底栏改为壳内绝对定位、页头安全区、确认弹窗 portal 到 `document.body`、启动图标统一、版本升到 2.0.0 | 已完成 |
