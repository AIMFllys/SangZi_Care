# 智护银龄 — Android 在线 WebView 壳

> 桑梓智护移动端 · **模式 B**：打开云端 https，不内嵌静态整站

## 应用信息

- **APP 名称**: 智护银龄
- **包名**: `com.sangzi.smartcare`
- **加载方式**: WebView → `strings.xml` 中的 `app_base_url`

## 环境要求

- Android SDK 34
- Kotlin 1.9+
- Gradle 8.2+
- 最低 Android 8.0 (API 26)

## 配置基址

编辑 [`app/src/main/res/values/strings.xml`](app/src/main/res/values/strings.xml)：

```xml
<!-- 生产：EdgeOne 分配的 https 域名 -->
<string name="app_base_url">https://your-edgeone-domain</string>

<!-- 模拟器访问本机 Next：http://10.0.2.2:7742 -->
<!-- 真机调试：http://<电脑局域网IP>:7742 -->
```

## 构建 APK

```bash
./gradlew assembleRelease
```

**不要**再执行「`next build` → 拷贝 `out/` 到 `assets/web/`」——该流程已废弃。

## JSBridge

原生注入名：`window.SangZiBridge`

| 方法 | 说明 |
|------|------|
| `makePhoneCall(number)` | 拨打电话 |
| `speak(text, rate)` | TTS |
| `stopSpeak()` | 停止 TTS |
| `isTTSAvailable()` | TTS 是否可用 |
| `startASR()` | 启动语音识别 |
| `isASRAvailable()` | ASR 是否可用 |
| `getItem` / `setItem` / `removeItem` | 本地存储 |

**已知问题**：前端 [`lib/jsbridge.ts`](../lib/jsbridge.ts) 仍期望 `AndroidBridge` 与不同 API 形态，Native 语音路径当前不可用（见 [docs/issues/tech-debt.md](../docs/issues/tech-debt.md) TD-20）。

## 相关

- [目标架构](../docs/designs/target-architecture.md)
- [EdgeOne 部署](../docs/ops/deploy-edgeone.md)
