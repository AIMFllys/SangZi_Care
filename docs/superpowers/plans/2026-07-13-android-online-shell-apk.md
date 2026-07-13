# Android Online Shell APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Revised after the 2026-07-13 executable audit: plain-JVM URI tests, trustworthy loopback Debug origin, distinct Debug package ID, permission-result revalidation, correct AndroidX Safe Browsing call, and final APK artifact checks are mandatory.

**Goal:** Produce a hardened, signed, installable Android WebView APK that loads `https://sangzicare.husteread.com`, grants microphone access only to that origin, and runs the same MiMo web voice path as browsers.

**Architecture:** Keep Android as a thin online shell. Production and debug variants provide different base URLs, application IDs, and cleartext policies; Debug uses `adb reverse` plus a trustworthy loopback origin. Pure JVM policies own URL classification and microphone grant decisions, while `MainActivity` owns Android permission handoff, WebView lifecycle, and system external intents. Remove the incompatible JavaScript speech/storage bridge so untrusted pages cannot reach native privileged methods. Release signing values come from ignored local properties/environment variables and the keystore never enters Git.

**Tech Stack:** Android Gradle Plugin 8.2.2, Gradle 8.2.1 wrapper, Kotlin 1.9.22, JDK 17, compile/target SDK 34, AndroidX WebKit 1.10, JUnit 4.

---

## File map

**Create**

- `android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar`, `gradle-wrapper.properties`.
- `android/app/src/debug/AndroidManifest.xml` — debug-only cleartext override.
- `android/app/src/debug/res/values/strings.xml` — emulator URL.
- `android/app/src/debug/res/xml/network_security_config.xml` — loopback-only cleartext exception.
- `android/app/src/main/kotlin/com/sangzi/smartcare/UrlPolicy.kt` — pure navigation policy.
- `android/app/src/test/kotlin/com/sangzi/smartcare/UrlPolicyTest.kt`.
- `android/app/src/main/kotlin/com/sangzi/smartcare/MicrophonePermissionPolicy.kt`.
- `android/app/src/test/kotlin/com/sangzi/smartcare/MicrophonePermissionPolicyTest.kt`.
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` and round icon.
- `android/app/src/main/res/drawable/ic_launcher_foreground.xml`.
- `android/app/src/main/res/values/colors.xml`.
- `android/keystore.properties.example` — names only, no values.
- `android/build_apk.ps1` — online-shell build/verify helper.

**Modify**

- Inspect without changing: `.gitignore`; signing artifacts and APK/AAB outputs are already ignored.
- Inspect without changing: `android/settings.gradle`, `android/build.gradle`, `android/gradle.properties`; current AGP/Kotlin/JVM values are the target contract.
- `android/app/build.gradle` — variants, tests, release signing, version.
- `android/app/src/main/AndroidManifest.xml` — secure production permissions/policy.
- `android/app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt` — hardened WebView.
- `android/app/src/main/res/values/{strings,styles}.xml`.
- `android/proguard-rules.pro` — delete the obsolete JSBridge keep rule after the bridge is removed.
- `android/README.md`, `docs/ops/deploy-edgeone.md`, `docs/issues/tech-debt.md`, `docs/详解/*`.
- Delete: `android/build_apk.sh` (obsolete static-export flow).
- Delete: `lib/jsbridge.ts` and `lib/__tests__/jsbridge.test.ts`; no production import remains and the online shell exposes no native bridge.

## Task 1: Restore a reproducible Gradle project and launcher resources

**Files:**

- Create: Gradle Wrapper files listed above.
- Create: adaptive icon XML resources.
- Modify: `android/app/build.gradle`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/src/main/res/values/colors.xml`

- [ ] **Step 1: Verify the current expected build failures**

Run from `android/`:

```powershell
Test-Path .\gradlew.bat
Test-Path .\gradle\wrapper\gradle-wrapper.jar
Test-Path .\app\src\main\res\mipmap-anydpi-v26\ic_launcher.xml
```

Expected before the task: all three are `False`.

- [ ] **Step 2: Generate an official Gradle 8.2.1 wrapper**

Download `https://services.gradle.org/distributions/gradle-8.2.1-bin.zip` to an OS temporary directory, verify SHA-256 `03ec176d388f2aa99defcadc3ac6adf8dd2bce5145a129659537c0874dea5ad1`, expand it, then run its `bin/gradle.bat wrapper --gradle-version 8.2.1 --distribution-type bin` from `android/`. Delete the temporary distribution after wrapper generation. Set:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.2.1-bin.zip
distributionSha256Sum=03ec176d388f2aa99defcadc3ac6adf8dd2bce5145a129659537c0874dea5ad1
```

Before committing, independently verify the downloaded distribution checksum against `https://services.gradle.org/distributions/gradle-8.2.1-bin.zip.sha256`.

- [ ] **Step 3: Add vector/adaptive launcher resources**

Because minSdk is 26, use `mipmap-anydpi-v26` adaptive XML without PNG. Reference a warm/cool care mark built from original vector paths, not third-party artwork. Add `android:roundIcon="@mipmap/ic_launcher_round"`.

- [ ] **Step 4: Add JUnit test dependency and stable build features**

```groovy
dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.webkit:webkit:1.10.0'
    testImplementation 'junit:junit:4.13.2'
}
```

Keep Java/Kotlin target 17, AGP 8.2.2, and Kotlin 1.9.22. Do not rely on generated `BuildConfig`; use the application debuggable flag when enabling WebView debugging. A compatibility failure stops this task for diagnosis; it does not authorize an unplanned version upgrade.

- [ ] **Step 5: Verify wrapper and resource compilation**

Set `ANDROID_HOME` to the installed SDK and run:

```powershell
.\gradlew.bat --version
.\gradlew.bat :app:processDebugResources :app:compileDebugKotlin
```

Expected: Gradle 8.2.1, JVM 17, both tasks succeed, no missing launcher resource.

- [ ] **Step 6: Commit the reproducible Android build base**

```powershell
git add android/gradlew android/gradlew.bat android/gradle android/app/build.gradle android/app/src/main/res android/app/src/main/AndroidManifest.xml
git commit -m "build(android): restore Gradle wrapper and launcher resources"
```

## Task 2: Separate production and debug URL/network policies

**Files:**

- Modify: `android/app/src/main/res/values/strings.xml`
- Create: `android/app/src/debug/res/values/strings.xml`
- Create: `android/app/src/debug/res/xml/network_security_config.xml`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/debug/AndroidManifest.xml`
- Modify: `android/app/build.gradle`

- [ ] **Step 1: Write failing resource/manifest assertions**

Use Gradle resource processing or a small XML test to assert:

- main `app_base_url` equals `https://sangzicare.husteread.com`;
- debug override equals `http://127.0.0.1:7742`;
- main manifest has `usesCleartextTraffic="false"`;
- debug config denies cleartext by default and permits only `127.0.0.1`;
- Debug application ID is `com.sangzi.smartcare.debug`, while Release remains `com.sangzi.smartcare`.

Expected before changes: production is `https://example.com` and cleartext is globally enabled.

- [ ] **Step 2: Set exact resource values**

Main:

```xml
<string name="app_base_url" translatable="false">https://sangzicare.husteread.com</string>
```

Debug override:

```xml
<string name="app_base_url" translatable="false">http://127.0.0.1:7742</string>
```

- [ ] **Step 3: Lock production network security**

Main manifest uses `android:usesCleartextTraffic="false"`, `android:allowBackup="false"`, and no broad network-security exception. Remove the forced portrait declaration so the audited responsive landscape layout is reachable. Debug uses `applicationIdSuffix ".debug"`, the tools namespace, and a debug-only network security config with `base-config cleartextTrafficPermitted="false"` plus one non-subdomain loopback exception. Set `usesCleartextTraffic="true"` only in Debug so Android consults that precise config.

- [ ] **Step 4: Verify merged manifests for both variants**

Run:

```powershell
.\gradlew.bat :app:processDebugMainManifest :app:processReleaseMainManifest
```

Inspect merged outputs. Expected: Debug resolves to `.debug`, loopback config, and cleartext true; Release resolves to the production ID, no debug config, and cleartext false.

- [ ] **Step 5: Commit URL and variant policy**

```powershell
git add android/app/src/main android/app/src/debug android/app/build.gradle
git commit -m "feat(android): separate production and debug web origins"
```

## Task 3: Implement a pure, tested navigation allowlist

**Files:**

- Create: `android/app/src/main/kotlin/com/sangzi/smartcare/UrlPolicy.kt`
- Create: `android/app/src/test/kotlin/com/sangzi/smartcare/UrlPolicyTest.kt`
- Modify: `android/app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt`

- [ ] **Step 1: Write failing URL policy tests**

Use `java.net.URI` or raw strings only; ordinary JUnit must not call Android framework stubs. Cover exact-origin paths, implicit/explicit default ports, host case normalization, userinfo, lookalike hosts, invalid URI text, external HTTP(S), `tel:`, and blocked `javascript:`, `file:`, `content:`, and `intent:` schemes. Activity integration checks must also prove external subframes never launch system intents.

- [ ] **Step 2: Run and verify missing class failure**

Run: `.\gradlew.bat testDebugUnitTest --tests com.sangzi.smartcare.UrlPolicyTest`

Expected: compilation FAIL because `UrlPolicy` is missing.

- [ ] **Step 3: Implement exact scheme/host/port matching**

`ALLOW_IN_WEBVIEW` requires same normalized scheme, host, and effective port as the configured base URL, with no userinfo. `tel:` returns `DIAL`; external HTTP(S) returns `OPEN_EXTERNAL`; every other or malformed scheme returns `BLOCK`.

- [ ] **Step 4: Use policy in `shouldOverrideUrlLoading`**

- same origin: return false;
- main-frame telephone: validate the dial string and launch `Intent.ACTION_DIAL` (no CALL_PHONE permission);
- main-frame external HTTP(S): `Intent.ACTION_VIEW` in a try/catch;
- subframe telephone or external HTTP(S): block without launching an intent;
- blocked: return true and do not load.

Also override the deprecated String method for API consistency even though minSdk 26 normally uses `WebResourceRequest`.

- [ ] **Step 5: Run tests and Android lint**

Run: `.\gradlew.bat testDebugUnitTest lintDebug`

Expected: PASS; no unsafe arbitrary URL navigation finding.

- [ ] **Step 6: Commit navigation security**

```powershell
git add android/app/src/main/kotlin android/app/src/test
git commit -m "feat(android): restrict WebView navigation to trusted origin"
```

## Task 4: Replace the broken native bridge with origin-scoped web microphone permission

**Files:**

- Modify: `android/app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/kotlin/com/sangzi/smartcare/MicrophonePermissionPolicy.kt`
- Create: `android/app/src/test/kotlin/com/sangzi/smartcare/MicrophonePermissionPolicyTest.kt`
- Modify: `android/proguard-rules.pro`
- Delete: `lib/jsbridge.ts` and `lib/__tests__/jsbridge.test.ts`

- [ ] **Step 1: Write/adjust web tests proving Native ASR/TTS is not selected**

Run the voice capability tests and a source contract test proving there is no `addJavascriptInterface`, `AndroidBridge`, or `SangZiBridge` dependency. Delete the unused web compatibility wrapper rather than documenting a bridge the shell no longer injects.

- [ ] **Step 2: Remove unnecessary native privileges**

Delete `CALL_PHONE`, TextToSpeech, RecognizerIntent, SharedPreferences bridge methods, `addJavascriptInterface`, and the entire broad JSBridge inner class. Keep `RECORD_AUDIO`, INTERNET, and ACCESS_NETWORK_STATE.

- [ ] **Step 3: Harden WebView settings**

```kotlin
settings.javaScriptEnabled = true
settings.domStorageEnabled = true
settings.allowFileAccess = false
settings.allowContentAccess = false
settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
settings.mediaPlaybackRequiresUserGesture = false
CookieManager.getInstance().setAcceptThirdPartyCookies(this, false)
```

The assistant speaks after an asynchronous MiMo response, so trusted same-origin media playback is allowed without a second tap. Enable WebView debugging only when `ApplicationInfo.FLAG_DEBUGGABLE` is present. Guard safe browsing with `WebViewFeature.isFeatureSupported(WebViewFeature.START_SAFE_BROWSING)`, then call `WebViewCompat.startSafeBrowsing(applicationContext) { ... }` using the actual AndroidX signature.

- [ ] **Step 4: Implement microphone permission handoff**

First write pure `MicrophonePermissionPolicy` tests. Use `registerForActivityResult(ActivityResultContracts.RequestPermission())`. In `WebChromeClient.onPermissionRequest`, accept only when:

1. `request.origin` exactly matches the configured base origin;
2. requested resources are limited to `RESOURCE_AUDIO_CAPTURE`;
3. the current top-level WebView URL is same-origin.

Grant only `RESOURCE_AUDIO_CAPTURE`; deny all others. Store one pending request while Android permission UI is open. When Android returns, re-check the request origin, exact resources, and current top-level URL before granting. Deny and clear it on replacement, `onPermissionRequestCanceled`, top-level navigation, `onStop`, Activity destruction, or user refusal.

- [ ] **Step 5: Handle WebView lifecycle and SSL safely**

Pause/resume WebView timers with Activity lifecycle. Never override SSL errors to proceed. Show a retryable native error surface on main-frame network failure without loading a `file:`, `content:`, `data:`, or external fallback page.

- [ ] **Step 6: Run web tests, Android unit tests, and lint**

Run:

```powershell
npm run tsc
npx vitest run lib/__tests__/voiceCapabilities.test.ts
Set-Location android
.\gradlew.bat testDebugUnitTest lintDebug
```

Expected: all exit 0; search finds no `addJavascriptInterface`, `AndroidBridge`, `SangZiBridge`, Native TTS, or Native ASR, and the obsolete ProGuard keep rule is gone.

- [ ] **Step 7: Commit the WebView microphone path**

```powershell
git add android/app/src/main android/app/src/test android/proguard-rules.pro lib/jsbridge.ts lib/__tests__/jsbridge.test.ts lib/voiceCapabilities.ts lib/__tests__/voiceCapabilities.test.ts
git commit -m "feat(android): grant trusted web microphone access"
```

## Task 5: Add secure external release signing and online-shell build tooling

**Files:**

- Inspect without changing: `.gitignore`
- Modify: `android/app/build.gradle`
- Create: `android/keystore.properties.example`
- Create: `android/build_apk.ps1`
- Delete: `android/build_apk.sh`
- Modify: `android/README.md`

- [ ] **Step 1: Verify artifact ignores and write a failing unsigned-Release check**

`git check-ignore` already proves JKS, keystore properties, APK/AAB, and release outputs are ignored; do not manufacture a false RED. Instead assert that a requested Release assembly fails with a clear signing-input error while Debug remains buildable.

- [ ] **Step 2: Add ignore rules**

Retain and verify the existing `*.jks`, `*.keystore`, `keystore.properties`, `*.apk`, and `*.aab` rules; keep `android/keystore.properties.example` tracked.

- [ ] **Step 3: Configure release signing without literal secrets**

Load `android/keystore.properties` when present, otherwise environment variables:

- `SANGZI_STORE_FILE`
- `SANGZI_STORE_PASSWORD`
- `SANGZI_KEY_ALIAS`
- `SANGZI_KEY_PASSWORD`

Create `signingConfigs.release` only when all values exist. A requested Release build must fail early with a clear message if signing is absent; Debug remains buildable.

- [ ] **Step 4: Replace the obsolete shell script**

Delete the static-export/out-copy script. `build_apk.ps1` must:

1. resolve and validate Android workspace paths;
2. verify `ANDROID_HOME`, JDK 17, wrapper, production URL, and signing inputs;
3. run `clean lintRelease testReleaseUnitTest validateSigningRelease assembleRelease`;
4. run `zipalign -c -v 4`, `apksigner verify --verbose --print-certs`, `aapt dump badging`, and `aapt dump permissions`;
5. copy the verified APK to an ignored `android/app/release/` path;
6. repeat zipalign/signature/badging/permission checks on the copied file, assert package `com.sangzi.smartcare`, absence of `CALL_PHONE`, absence of cleartext policy, and the production URL in packaged resources;
7. print path, size, source commit, version, signer certificate digest, and SHA-256 but never passwords.

PowerShell 5.1 does not stop on external-command failure merely because `$ErrorActionPreference = 'Stop'`; check `$LASTEXITCODE` after every Gradle, SDK, Git, and Java tool invocation.

- [ ] **Step 5: Generate a local release keystore outside Git**

Use `keytool -genkeypair` with a strong randomly generated password stored only in ignored `keystore.properties`. Use a long validity and a stable alias. Back up the keystore securely because all future upgrades must use it. Do not print passwords in terminal output or documentation.

- [ ] **Step 6: Verify Debug and signed Release builds**

Run:

```powershell
.\gradlew.bat clean lintDebug testDebugUnitTest assembleDebug
.\build_apk.ps1
```

Expected: both succeed; Release APK is signed; Git does not list keystore/APK.

- [ ] **Step 7: Commit signing/build configuration**

```powershell
git add android/app/build.gradle android/keystore.properties.example android/build_apk.ps1 android/README.md android/build_apk.sh
git commit -m "build(android): add secure signed online-shell APK flow"
```

## Task 6: Install and verify the real production shell

**Files:**

- Modify: `android/README.md`
- Modify: `docs/ops/deploy-edgeone.md`
- Modify: `docs/issues/tech-debt.md`
- Modify: `docs/详解/项目结构详解.md`
- Modify: `docs/详解/功能详解.md`

- [ ] **Step 1: Prove production DNS/TLS before final APK acceptance**

Run public DoH and HTTPS checks. Ignore local `198.18.0.0/15` synthetic/test answers. Expected: `sangzicare.husteread.com` is no longer NXDOMAIN and has a valid certificate. Building may happen earlier, but final acceptance cannot pass while the URL is unreachable.

- [ ] **Step 2: Install Debug on emulator/device**

Start the `SciChatApi35` AVD, run `adb reverse tcp:7742 tcp:7742`, then install `app-debug.apk`. Verify the `.debug` package loads `http://127.0.0.1:7742`, back navigation, external link handoff, phone dialer, offline error/retry, rotation, and no arbitrary file/content URL loads.

- [ ] **Step 3: Verify microphone permission end-to-end**

On first use: Android asks RECORD_AUDIO once, WebView grants audio capture only after approval, recording stops, WAV uploads, and MiMo returns Chinese text. Test refusal, second attempt, app background/foreground, and orientation policy.

- [ ] **Step 4: Install signed Release**

Install the Release APK alongside the `.debug` package; differing application IDs avoid signing-key update conflicts. Expected: install succeeds, production HTTPS app loads, login persists across restart, and no cleartext/mixed-content warning occurs.

- [ ] **Step 5: Verify TTS/ASR and app lifecycle in Release/R8**

Cover assistant ASR→AI→TTS, health voice input confirmation, chat recording/playback, TTS stop, screen lock/unlock, process restart, system back, and network loss/recovery.

- [ ] **Step 6: Verify artifact identity**

Run `apksigner verify --verbose --print-certs`, `aapt dump badging`, and `Get-FileHash -Algorithm SHA256`. Record package `com.sangzi.smartcare`, versionCode/versionName, signer SHA-256, APK SHA-256, and exact source commit.

- [ ] **Step 7: Update live documentation and close resolved debt**

Remove claims that the app embeds `out/` or depends on Native ASR/TTS. Document keystore preservation without secrets, production URL, build commands, microphone policy, and verified artifact metadata.

- [ ] **Step 8: Commit verification documentation**

```powershell
git add android/README.md docs/ops/deploy-edgeone.md docs/issues/tech-debt.md docs/详解
git commit -m "docs(android): record signed production APK verification"
```
