package com.sangzi.smartcare

import java.net.URI
import java.net.URISyntaxException
import java.util.Locale

/**
 * 不依赖 Android framework 的导航策略，普通 JVM 单测可直接覆盖。
 */
class UrlPolicy(baseUrl: String) {
    enum class Action {
        ALLOW_IN_WEBVIEW,
        OPEN_EXTERNAL,
        DIAL,
        BLOCK,
    }

    private data class Origin(
        val scheme: String,
        val host: String,
        val port: Int,
    )

    private val trustedOrigin: Origin = parseNetworkOrigin(baseUrl)
        ?: throw IllegalArgumentException("app_base_url 必须是无凭据的绝对 HTTP(S) URL")

    fun classify(rawUrl: String): Action {
        val uri = parse(rawUrl) ?: return Action.BLOCK
        val scheme = uri.scheme?.lowercase(Locale.ROOT) ?: return Action.BLOCK

        if (scheme == "tel") {
            return if (isSafeTelephoneUri(uri)) Action.DIAL else Action.BLOCK
        }
        if (scheme != "http" && scheme != "https") return Action.BLOCK

        val origin = networkOrigin(uri) ?: return Action.BLOCK
        return if (origin == trustedOrigin) {
            Action.ALLOW_IN_WEBVIEW
        } else {
            Action.OPEN_EXTERNAL
        }
    }

    fun isSameOrigin(rawUrl: String): Boolean =
        classify(rawUrl) == Action.ALLOW_IN_WEBVIEW

    private fun parseNetworkOrigin(rawUrl: String): Origin? {
        val uri = parse(rawUrl) ?: return null
        val scheme = uri.scheme?.lowercase(Locale.ROOT) ?: return null
        if (scheme != "http" && scheme != "https") return null
        return networkOrigin(uri)
    }

    private fun networkOrigin(uri: URI): Origin? {
        if (uri.userInfo != null) return null
        val scheme = uri.scheme?.lowercase(Locale.ROOT) ?: return null
        val host = uri.host?.lowercase(Locale.ROOT)?.takeIf { it.isNotBlank() }
            ?: return null
        val port = when {
            uri.port in 1..65535 -> uri.port
            uri.port != -1 -> return null
            scheme == "https" -> 443
            scheme == "http" -> 80
            else -> return null
        }
        return Origin(scheme = scheme, host = host, port = port)
    }

    private fun isSafeTelephoneUri(uri: URI): Boolean {
        if (uri.rawFragment != null) return false
        val dialString = uri.rawSchemeSpecificPart ?: return false
        return SAFE_DIAL_STRING.matches(dialString)
    }

    private fun parse(rawUrl: String): URI? = try {
        URI(rawUrl)
    } catch (_: URISyntaxException) {
        null
    }

    private companion object {
        val SAFE_DIAL_STRING = Regex("""\+?[0-9]+(?:-[0-9]+)*""")
    }
}
