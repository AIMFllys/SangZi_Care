package com.sangzi.smartcare

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UrlPolicyTest {
    private val production = UrlPolicy("https://sangzicare.husteread.com")

    @Test
    fun allowsOnlyTheExactOriginIncludingDefaultPortEquivalence() {
        listOf(
            "https://sangzicare.husteread.com/",
            "https://sangzicare.husteread.com/messages/1?from=family#latest",
            "HTTPS://SANGZICARE.HUSTEREAD.COM:443/health",
        ).forEach { url ->
            assertEquals(UrlPolicy.Action.ALLOW_IN_WEBVIEW, production.classify(url))
            assertTrue(production.isSameOrigin(url))
        }
    }

    @Test
    fun opensValidExternalHttpLinksOutsideTheWebView() {
        listOf(
            "http://sangzicare.husteread.com/",
            "https://sangzicare.husteread.com:444/",
            "https://example.org/help",
            "https://sangzicare.husteread.com.evil.test/",
        ).forEach { url ->
            assertEquals(UrlPolicy.Action.OPEN_EXTERNAL, production.classify(url))
            assertFalse(production.isSameOrigin(url))
        }
    }

    @Test
    fun rejectsUserInfoAndMalformedOrNonNetworkUrls() {
        listOf(
            "https://user@sangzicare.husteread.com/",
            "javascript:alert(1)",
            "file:///sdcard/private.txt",
            "content://com.example/private",
            "intent://scan/#Intent;scheme=zxing;end",
            "data:text/html,hello",
            "https:\\sangzicare.husteread.com\\health",
            "not a url",
            "//sangzicare.husteread.com/health",
        ).forEach { url ->
            assertEquals(UrlPolicy.Action.BLOCK, production.classify(url))
            assertFalse(production.isSameOrigin(url))
        }
    }

    @Test
    fun sendsTelephoneLinksToTheDialerPolicy() {
        listOf(
            "tel:+86120",
            "tel:120",
            "tel:+86-10-12345678",
        ).forEach { url ->
            assertEquals(UrlPolicy.Action.DIAL, production.classify(url))
        }
    }

    @Test
    fun rejectsMalformedOrUnsafeTelephoneLinks() {
        listOf(
            "tel:",
            "tel:javascript:alert(1)",
            "tel:+86120?body=unsafe",
            "tel:+86120#fragment",
            "tel:%2B86120",
            "tel://user@86120",
            " tel:+86120",
        ).forEach { url ->
            assertEquals(UrlPolicy.Action.BLOCK, production.classify(url))
        }
    }

    @Test
    fun honorsTheDebugOriginsExplicitPort() {
        val debug = UrlPolicy("http://127.0.0.1:7742")

        assertEquals(
            UrlPolicy.Action.ALLOW_IN_WEBVIEW,
            debug.classify("http://127.0.0.1:7742/voice"),
        )
        assertEquals(
            UrlPolicy.Action.OPEN_EXTERNAL,
            debug.classify("http://127.0.0.1/voice"),
        )
    }

    @Test
    fun wiresUrlPolicyIntoModernAndLegacyNavigationCallbacks() {
        val source = mainActivitySource()

        assertTrue(source.contains("val urlPolicy = UrlPolicy(baseUrl)"))
        assertTrue(source.contains("request.isForMainFrame"))
        assertTrue(
            source.contains(
                "handleWebNavigation(rawUrl, request.isForMainFrame, urlPolicy)",
            ),
        )
        assertTrue(source.contains("handleWebNavigation(rawUrl, true, urlPolicy)"))
    }

    @Test
    fun blocksSubframesBeforeDialOrExternalViewIntents() {
        val handler = mainActivityFunction("handleWebNavigation")
        val frameGuard = handler.indexOf("if (!isForMainFrame) return true")
        val dialIntent = handler.indexOf("Intent.ACTION_DIAL")
        val externalViewIntent = handler.indexOf("Intent.ACTION_VIEW")

        assertTrue("missing subframe guard", frameGuard >= 0)
        assertTrue("dial intent must follow the subframe guard", dialIntent > frameGuard)
        assertTrue(
            "external view intent must follow the subframe guard",
            externalViewIntent > frameGuard,
        )
    }

    @Test
    fun mapsPolicyActionsToSafeMainFrameBehavior() {
        val handler = mainActivityFunction("handleWebNavigation")
        val launcher = mainActivityFunction("launchSystemIntent")

        assertTrue(
            handler.contains(
                "if (action == UrlPolicy.Action.ALLOW_IN_WEBVIEW) return false",
            ),
        )
        assertTrue(
            handler.contains(
                "UrlPolicy.Action.DIAL -> launchSystemIntent(Intent.ACTION_DIAL, rawUrl)",
            ),
        )
        assertTrue(
            handler.contains(
                "UrlPolicy.Action.OPEN_EXTERNAL -> " +
                    "launchSystemIntent(Intent.ACTION_VIEW, rawUrl)",
            ),
        )
        assertTrue(handler.contains("UrlPolicy.Action.BLOCK -> Unit"))
        assertTrue(launcher.contains("try {"))
        assertTrue(launcher.contains("startActivity(Intent(action, Uri.parse(rawUrl)))"))
        assertTrue(launcher.contains("catch (_: ActivityNotFoundException)"))
        assertTrue(launcher.contains("catch (_: SecurityException)"))
    }

    private fun mainActivityFunction(name: String): String {
        val source = mainActivitySource()
        return source.substringAfter("private fun $name(", missingDelimiterValue = "")
            .substringBefore("\n    private fun ")
    }

    private fun mainActivitySource(): String {
        val moduleRelativePath =
            "src/main/kotlin/com/sangzi/smartcare/MainActivity.kt"
        val sourceFile = listOf(
            File(moduleRelativePath),
            File("app", moduleRelativePath),
            File("android/app", moduleRelativePath),
        ).firstOrNull(File::isFile)
            ?: error("找不到 MainActivity.kt 源文件")

        return sourceFile.readText(Charsets.UTF_8)
    }
}
