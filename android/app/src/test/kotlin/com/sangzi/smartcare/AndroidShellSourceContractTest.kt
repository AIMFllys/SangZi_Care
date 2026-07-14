package com.sangzi.smartcare

import java.io.File
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

        assertTrue(manifest.contains("android.permission.INTERNET"))
        assertTrue(manifest.contains("android.permission.RECORD_AUDIO"))
        assertTrue(manifest.contains("android.permission.ACCESS_NETWORK_STATE"))
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
        val androidRoot = projectFile("app/build.gradle").parentFile.parentFile
        return if (File(androidRoot, "package.json").isFile) {
            androidRoot
        } else {
            androidRoot.parentFile
        }
    }
}
