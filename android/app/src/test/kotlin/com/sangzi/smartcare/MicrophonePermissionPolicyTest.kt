package com.sangzi.smartcare

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MicrophonePermissionPolicyTest {
    private val production =
        MicrophonePermissionPolicy("https://sangzicare.husteread.com")

    @Test
    fun allowsOnlyAudioCaptureForTheTrustedRequestAndTopLevelOrigins() {
        assertTrue(
            production.canGrant(
                requestOrigin = "https://sangzicare.husteread.com",
                requestedResources = listOf(
                    MicrophonePermissionPolicy.AUDIO_CAPTURE_RESOURCE,
                ),
                topLevelUrl = "https://sangzicare.husteread.com/assistant?mode=voice",
            ),
        )
        assertTrue(
            production.canGrant(
                requestOrigin = "HTTPS://SANGZICARE.HUSTEREAD.COM:443/",
                requestedResources = listOf(
                    MicrophonePermissionPolicy.AUDIO_CAPTURE_RESOURCE,
                ),
                topLevelUrl = "https://sangzicare.husteread.com:443/messages",
            ),
        )
    }

    @Test
    fun rejectsUntrustedOrMalformedRequestOrigins() {
        listOf(
            null,
            "",
            "https://sangzicare.husteread.com/assistant",
            "https://user@sangzicare.husteread.com",
            "https://sangzicare.husteread.com.evil.test",
            "http://sangzicare.husteread.com",
            "https://sangzicare.husteread.com:444",
            "not a uri",
        ).forEach { origin ->
            assertFalse(
                production.canGrant(
                    requestOrigin = origin,
                    requestedResources = listOf(
                        MicrophonePermissionPolicy.AUDIO_CAPTURE_RESOURCE,
                    ),
                    topLevelUrl = "https://sangzicare.husteread.com/assistant",
                ),
            )
        }
    }

    @Test
    fun rejectsRequestsWhenTheCurrentTopLevelPageIsNotTrusted() {
        listOf(
            null,
            "",
            "https://example.org/assistant",
            "https://sangzicare.husteread.com.evil.test/assistant",
            "file:///android_asset/index.html",
            "not a uri",
        ).forEach { topLevelUrl ->
            assertFalse(
                production.canGrant(
                    requestOrigin = "https://sangzicare.husteread.com",
                    requestedResources = listOf(
                        MicrophonePermissionPolicy.AUDIO_CAPTURE_RESOURCE,
                    ),
                    topLevelUrl = topLevelUrl,
                ),
            )
        }
    }

    @Test
    fun rejectsEmptyMixedDuplicatedOrUnknownResourceSets() {
        listOf(
            emptyList(),
            listOf("android.webkit.resource.VIDEO_CAPTURE"),
            listOf(
                MicrophonePermissionPolicy.AUDIO_CAPTURE_RESOURCE,
                "android.webkit.resource.VIDEO_CAPTURE",
            ),
            listOf(
                MicrophonePermissionPolicy.AUDIO_CAPTURE_RESOURCE,
                MicrophonePermissionPolicy.AUDIO_CAPTURE_RESOURCE,
            ),
        ).forEach { resources ->
            assertFalse(
                production.canGrant(
                    requestOrigin = "https://sangzicare.husteread.com",
                    requestedResources = resources,
                    topLevelUrl = "https://sangzicare.husteread.com/assistant",
                ),
            )
        }
    }

    @Test
    fun honorsTheDebugOriginsExplicitPort() {
        val debug = MicrophonePermissionPolicy("http://127.0.0.1:7742")
        val audio = listOf(MicrophonePermissionPolicy.AUDIO_CAPTURE_RESOURCE)

        assertTrue(
            debug.canGrant(
                "http://127.0.0.1:7742",
                audio,
                "http://127.0.0.1:7742/assistant",
            ),
        )
        assertFalse(
            debug.canGrant(
                "http://127.0.0.1",
                audio,
                "http://127.0.0.1:7742/assistant",
            ),
        )
    }
}
