package com.sangzi.smartcare

import java.net.URI
import java.net.URISyntaxException

/**
 * 不依赖 Android framework 的 Web 麦克风授权策略。
 */
class MicrophonePermissionPolicy(baseUrl: String) {
    private val urlPolicy = UrlPolicy(baseUrl)

    fun canGrant(
        requestOrigin: String?,
        requestedResources: List<String>,
        topLevelUrl: String?,
    ): Boolean {
        if (requestOrigin == null || topLevelUrl == null) return false
        if (requestedResources != listOf(AUDIO_CAPTURE_RESOURCE)) return false
        if (!isOriginOnly(requestOrigin)) return false
        return urlPolicy.isSameOrigin(topLevelUrl)
    }

    private fun isOriginOnly(rawOrigin: String): Boolean {
        val uri = try {
            URI(rawOrigin)
        } catch (_: URISyntaxException) {
            return false
        }
        if (uri.rawQuery != null || uri.rawFragment != null) return false
        if (uri.rawPath != null && uri.rawPath != "" && uri.rawPath != "/") return false
        return urlPolicy.isSameOrigin(rawOrigin)
    }

    companion object {
        const val AUDIO_CAPTURE_RESOURCE = "android.webkit.resource.AUDIO_CAPTURE"
    }
}
