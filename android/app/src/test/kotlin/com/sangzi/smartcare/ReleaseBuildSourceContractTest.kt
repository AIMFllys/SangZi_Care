package com.sangzi.smartcare

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReleaseBuildSourceContractTest {
    @Test
    fun requiresExternalSigningInputsForReleaseArtifacts() {
        val gradle = androidFile("app/build.gradle").readText(Charsets.UTF_8)
        listOf(
            "SANGZI_STORE_FILE",
            "SANGZI_STORE_PASSWORD",
            "SANGZI_KEY_ALIAS",
            "SANGZI_KEY_PASSWORD",
            "Release signing inputs are missing",
            "releaseSigningComplete",
            "signingConfig signingConfigs.release",
        ).forEach { token ->
            assertTrue("build.gradle 缺少 $token", gradle.contains(token))
        }
    }

    @Test
    fun buildScriptRunsAndChecksEveryReleaseVerificationStage() {
        val script = androidFile("build_apk.ps1").readText(Charsets.UTF_8)
        val required = listOf(
            "clean",
            "lintRelease",
            "testReleaseUnitTest",
            "validateSigningRelease",
            "assembleRelease",
            "zipalign",
            "apksigner",
            "dump", "badging",
            "permissions",
            "Get-FileHash",
            "SHA256",
            "com.sangzi.smartcare",
            "android.permission.CALL_PHONE",
            "sangzicare.husteread.com",
            "git",
            "versionCode",
            "signer",
        )
        required.forEach { token ->
            assertTrue("build_apk.ps1 缺少 $token", script.contains(token))
        }
        assertTrue(script.contains("function Invoke-Native"))
        assertTrue(script.contains("\$LASTEXITCODE"))
        assertTrue("所有外部阶段必须走统一退出码门禁", script.windowed(
            "Invoke-Native".length,
        ).count { it == "Invoke-Native" } >= 8)
    }

    @Test
    fun keepsSigningSecretsAndArtifactsOutsideGit() {
        val example = androidFile("keystore.properties.example")
            .readLines(Charsets.UTF_8)
            .filter { it.isNotBlank() && !it.trimStart().startsWith("#") }

        assertTrue(example.contains("storeFile="))
        assertTrue(example.contains("storePassword="))
        assertTrue(example.contains("keyAlias="))
        assertTrue(example.contains("keyPassword="))
        assertTrue(example.all { it.substringAfter('=', "").isEmpty() })
        assertFalse(androidFile("build_apk.sh").exists())
    }

    @Test
    fun documentsTheOnlineShellInsteadOfTheRemovedBridge() {
        val readme = androidFile("README.md").readText(Charsets.UTF_8)

        assertTrue(readme.contains("https://sangzicare.husteread.com"))
        assertTrue(readme.contains("adb reverse tcp:7742 tcp:7742"))
        assertTrue(readme.contains("build_apk.ps1"))
        assertTrue(readme.contains("keystore.properties"))
        assertFalse(readme.contains("window.SangZiBridge"))
        assertFalse(readme.contains("原生注入名"))
    }

    private fun androidFile(relativePath: String): File {
        val androidRoot = listOf(
            File("."),
            File(".."),
            File("android"),
            File("../.."),
        ).firstOrNull { File(it, "app/build.gradle").isFile }
            ?: error("找不到 Android 模块根目录")
        return File(androidRoot, relativePath).canonicalFile
    }
}
