# 智护银龄 — Android WebView APK

> 桑梓智护项目的移动端 APP

## 应用信息

- **APP 名称**: 智护银龄
- **包名**: com.sangzi.smartcare
- **项目名称**: 桑梓智护（SangZi Smart Care）

## 环境要求

- Android SDK 34
- Kotlin 1.9+
- Gradle 8.2+
- 最低支持 Android 8.0 (API 26)

## 构建步骤

1. 前端静态导出: `cd .. && npx next build`
2. 复制 `out/` 到 `app/src/main/assets/web/`
3. 构建 APK: `./gradlew assembleRelease`

或使用一键脚本: `bash build_apk.sh`

## JSBridge 接口

通过 `window.SangZiBridge` 访问原生功能:

- `makePhoneCall(number)` — 拨打电话
- `speak(text, rate)` — TTS 语音合成
- `stopSpeak()` — 停止 TTS
- `isTTSAvailable()` — 检查 TTS 可用性
- `startASR()` — 启动语音识别
- `isASRAvailable()` — 检查 ASR 可用性
- `getItem(key)` / `setItem(key, value)` / `removeItem(key)` — 本地存储
