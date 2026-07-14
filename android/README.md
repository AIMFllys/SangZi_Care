# 智护银龄 Android 在线壳

Android 端是一个薄 WebView 壳，Release 只加载
`https://sangzicare.husteread.com`，不复制 Next.js 静态产物，也不维护第二套语音实现。

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

- ASR/TTS 与浏览器使用同一套服务端 MiMo API；Android 不注入原生 JavaScript bridge。
- Web 麦克风只对配置的精确同源页面开放，并且只授予
  `RESOURCE_AUDIO_CAPTURE`。
- Android 权限返回、页面导航、请求替换、取消、后台与销毁时都会重新验证或拒绝待处理请求。
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

## 构建并验证 Release APK

```powershell
Set-Location android
.\build_apk.ps1
```

脚本会运行 Release lint、单测、R8、签名与组装，再对源 APK 和复制后的交付 APK
分别执行 zipalign、apksigner、包名、权限、明文策略和生产 URL 检查。最终文件位于被忽略的
`android/app/release/`，控制台只输出路径、大小、提交、版本、签名证书摘要和 APK SHA-256。

相关文档：

- [目标架构](../docs/designs/target-architecture.md)
- [EdgeOne 部署](../docs/ops/deploy-edgeone.md)
