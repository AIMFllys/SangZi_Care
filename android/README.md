# 智护银龄 Android 在线壳

> Updated: 2026-07-13

Android 端是一个薄 WebView 壳，Release 只加载
`https://sangzicare.husteread.com`，不复制 Next.js 静态产物，也不维护第二套语音实现。
正式 URL 已写入 `app/src/main/res/values/strings.xml`；只有 Debug 资源会覆盖为本机回环地址。

## 变体

| 变体 | 包名 | 页面来源 | 明文流量 |
| --- | --- | --- | --- |
| Release | `com.sangzi.smartcare` | `https://sangzicare.husteread.com` | 禁止 |
| Debug | `com.sangzi.smartcare.debug` | `http://127.0.0.1:7742` | 仅回环地址 |

Debug 访问本机开发服务：

```powershell
npm run dev
adb reverse tcp:7742 tcp:7742
Set-Location android
.\gradlew.bat assembleDebug
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

## 语音与权限边界

- ASR/TTS 与浏览器使用同一套 Next 同源接口和服务端 MiMo；旧 `lib/jsbridge.ts` 已移除，Android 不注入 `AndroidBridge` 或 `SangZiBridge`。
- 网页通过标准 `getUserMedia` 录音；Web Speech 只作为明确降级，不是另一套 Android 原生语音实现。
- Web 麦克风只对配置的精确同源页面开放，并且只授予
  `RESOURCE_AUDIO_CAPTURE`。
- Android 权限返回、页面导航、请求替换、取消、后台与销毁时都会重新验证或拒绝待处理请求；进入后台时页面会先停止录音，随后暂停 WebView。
- 电话链接交给系统 `ACTION_DIAL`，应用不申请 `CALL_PHONE`。
- Release 禁止文件访问、内容访问、混合内容、第三方 Cookie 与明文网络。

## 签名配置

需要 JDK 17、Android SDK 34 和 Gradle Wrapper 8.2.1。复制示例并填写本地值：

```powershell
Copy-Item .\keystore.properties.example .\keystore.properties
```

`keystore.properties` 的字段为 `storeFile`、`storePassword`、`keyAlias`、
`keyPassword`。也可以改用同名环境变量：

- `SANGZI_STORE_FILE`
- `SANGZI_STORE_PASSWORD`
- `SANGZI_KEY_ALIAS`
- `SANGZI_KEY_PASSWORD`

keystore、`keystore.properties`、APK/AAB 和构建目录均被 Git 忽略。发布签名是后续升级
APK 的唯一身份，必须离线备份并长期保存；不要把口令写入文档、命令日志或仓库。

## Release 构建顺序

Release APK 是在线壳，必须先保证它加载的正式站点已经部署并可用：

1. 推送 EdgeOne 实际监听的生产分支，等待目标提交部署到 `https://sangzicare.husteread.com`。
2. 按 [EdgeOne 部署说明](../docs/ops/deploy-edgeone.md) 完成登录、MiMo ASR/TTS、私有语音上传 / 播放和移动端页面验收。
3. 回到目标提交，确认 `git status --short` 无输出。
4. 从该工作树构建签名 Release APK。脚本会在启动 Gradle 前检查完整 `git status --porcelain`，并请求正式 `/api/ping`；线上 `revision` 不等于本地 `HEAD`，或探针未满足浏览器/边缘不可陈旧缓存策略时直接终止，不会生成过期或 dirty Release。

## 构建并验证 Release APK

```powershell
Set-Location android
.\build_apk.ps1
```

脚本会先验证线上部署 revision 与探针缓存策略，再运行 Release lint、单测、R8、签名与组装，并对源 APK 和复制后的交付 APK
分别执行 zipalign、apksigner、包名、权限、明文策略和生产 URL 检查。最终文件位于被忽略的
`android/app/release/`，控制台只输出路径、大小、提交、版本、签名证书摘要和 APK SHA-256。

交付前保存这些非敏感元数据用于追溯，并在真机安装验收。Debug 使用
`com.sangzi.smartcare.debug`，可与 Release `com.sangzi.smartcare` 并存；不要用 Debug 包代替正式验收。
APK、AAB、keystore、`keystore.properties` 与任何 `.env*` 都不得提交到 Git。

相关文档：

- [目标架构](../docs/designs/target-architecture.md)
- [EdgeOne 部署](../docs/ops/deploy-edgeone.md)
