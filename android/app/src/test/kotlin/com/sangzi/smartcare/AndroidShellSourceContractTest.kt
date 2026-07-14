package com.sangzi.smartcare

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidShellSourceContractTest {
    @Test
    fun removesThePrivilegedJavascriptAndNativeSpeechBridge() {
        val source = projectFile(
            "app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt",
        ).readText(Charsets.UTF_8)
        val forbidden = listOf(
            "addJavascriptInterface",
            "SangZiBridge",
            "AndroidBridge",
            "@JavascriptInterface",
            "TextToSpeech",
            "RecognizerIntent",
            "ACTION_CALL",
            "getSharedPreferences",
        )

        forbidden.forEach { token ->
            assertFalse("MainActivity 仍包含 $token", source.contains(token))
        }
    }

    @Test
    fun keepsOnlyThePermissionsNeededByTheOnlineShell() {
        val manifest = projectFile("app/src/main/AndroidManifest.xml")
            .readText(Charsets.UTF_8)
        val permissions = Regex(
            """<uses-permission\s+android:name="([^"]+)"\s*/>""",
        ).findAll(manifest).map { it.groupValues[1] }.toSet()

        assertEquals(
            setOf(
                "android.permission.INTERNET",
                "android.permission.RECORD_AUDIO",
                "android.permission.MODIFY_AUDIO_SETTINGS",
                "android.permission.ACCESS_NETWORK_STATE",
            ),
            permissions,
        )
        assertTrue(manifest.contains("android:enableOnBackInvokedCallback=\"true\""))
        assertFalse(manifest.contains("android.permission.CALL_PHONE"))
    }

    @Test
    fun hardensWebViewAndScopesMicrophonePermission() {
        val source = projectFile(
            "app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt",
        ).readText(Charsets.UTF_8)
        val required = listOf(
            "settings.allowFileAccess = false",
            "settings.allowContentAccess = false",
            "WebSettings.MIXED_CONTENT_NEVER_ALLOW",
            "settings.mediaPlaybackRequiresUserGesture = false",
            "settings.userAgentString =",
            "ANDROID_SHELL_USER_AGENT_TOKEN",
            "setAcceptThirdPartyCookies(webView, false)",
            "ApplicationInfo.FLAG_DEBUGGABLE",
            "WebViewFeature.START_SAFE_BROWSING",
            "WebViewCompat.startSafeBrowsing",
            "ActivityResultContracts.RequestPermission()",
            "override fun onPermissionRequest(",
            "override fun onPermissionRequestCanceled(",
            "PermissionRequest.RESOURCE_AUDIO_CAPTURE",
            "microphonePermissionPolicy.canGrant(",
            "denyPendingMicrophoneRequest()",
            "Uri.parse(rawUrl).normalizeScheme()",
            "override fun onPageStarted(",
            "if (!urlPolicy.isSameOrigin(url))",
            "view?.stopLoading()",
        )

        required.forEach { token ->
            assertTrue("MainActivity 缺少 $token", source.contains(token))
        }
    }

    @Test
    fun usesOnlyANativeRetrySurfaceForMainFrameFailures() {
        val source = projectFile(
            "app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt",
        ).readText(Charsets.UTF_8)

        assertTrue(source.contains("request.isForMainFrame"))
        assertTrue(source.contains("showMainFrameError("))
        assertTrue(source.contains("webView.reload()"))
        listOf("loadData(", "loadDataWithBaseURL(", "file://", "content://", "data:")
            .forEach { token ->
                assertFalse("错误页不应使用 $token", source.contains(token))
            }
    }

    @Test
    fun handlesModernSystemBackBeforeFinishingTheActivity() {
        val source = projectFile(
            "app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt",
        ).readText(Charsets.UTF_8)
        val required = listOf(
            "OnBackPressedCallback(true)",
            "onBackPressedDispatcher.addCallback(",
            "override fun handleOnBackPressed()",
            "if (webView.canGoBack())",
            "webView.goBack()",
            "BackDecisionGuard()",
            "BACK_DECISION_TIMEOUT_MS",
            "mainHandler.postDelayed(",
            "mainHandler.removeCallbacks(",
            "backDecisionGuard.complete(",
            "BackDecisionGuard.Completion.PAGE_CHANGED",
            "cancelBackDecision()",
            "webView.evaluateJavascript(",
            "window.navigation",
            "history.back()",
            "isEnabled = false",
            "onBackPressedDispatcher.onBackPressed()",
        )

        required.forEach { token ->
            assertTrue("现代返回链路缺少 $token", source.contains(token))
        }
        assertFalse(source.contains("override fun onBackPressed()"))
    }

    @Test
    fun refusesLateMicrophoneRequestsAfterTheActivityStops() {
        val source = projectFile(
            "app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt",
        ).readText(Charsets.UTF_8)
        val required = listOf(
            "private var activityStarted = false",
            "override fun onStart()",
            "activityStarted = true",
            "activityStarted = false",
            "if (!activityStarted)",
            "androidPermissionGranted && activityStarted",
        )

        required.forEach { token ->
            assertTrue("后台麦克风门禁缺少 $token", source.contains(token))
        }
    }

    @Test
    fun signalsThePageBeforePausingAnActiveWebView() {
        val source = projectFile(
            "app/src/main/kotlin/com/sangzi/smartcare/MainActivity.kt",
        ).readText(Charsets.UTF_8)
        val onPause = source
            .substringAfter("override fun onPause()")
            .substringBefore("override fun onStop()")
        val required = listOf(
            "PAGE_BACKGROUND_EVENT_SCRIPT",
            "window.dispatchEvent(new Event('sangzi:app-background'))",
            "pauseWebViewAfterBackgroundSignal()",
            "completeWebViewPause(",
            "WEBVIEW_BACKGROUND_SIGNAL_TIMEOUT_MS",
            "mainHandler.postDelayed(",
            "microphonePermissionLaunchInFlight",
        )

        required.forEach { token ->
            assertTrue("WebView 后台释放协议缺少 $token", source.contains(token))
        }
        assertTrue(
            "必须先触发页面释放协议，再进入 Activity onPause",
            onPause.indexOf("pauseWebViewAfterBackgroundSignal()") in
                0 until onPause.indexOf("super.onPause()"),
        )
    }

    @Test
    fun removesTheObsoleteWebWrapperAndProguardBridgeRule() {
        val repositoryRoot = repositoryRoot()
        val proguard = projectFile("app/proguard-rules.pro").readText(Charsets.UTF_8)

        assertFalse(File(repositoryRoot, "lib/jsbridge.ts").exists())
        assertFalse(File(repositoryRoot, "lib/__tests__/jsbridge.test.ts").exists())
        assertFalse(proguard.contains("JSBridge"))
        assertFalse(proguard.contains("JavascriptInterface"))
    }

    private fun projectFile(relativePath: String): File {
        val androidRoot = listOf(
            File("."),
            File(".."),
            File("android"),
            File("../.."),
        ).firstOrNull { File(it, "app/build.gradle").isFile }
            ?: error("找不到 Android 模块根目录")
        return File(androidRoot, relativePath).canonicalFile
    }

    private fun repositoryRoot(): File {
        val androidRoot = projectFile("app/build.gradle").parentFile?.parentFile
            ?: error("找不到 Android 根目录")
        return if (File(androidRoot, "package.json").isFile) {
            androidRoot
        } else {
            androidRoot.parentFile ?: error("找不到仓库根目录")
        }
    }
}
