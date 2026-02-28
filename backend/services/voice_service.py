"""Voice processing service wrapping Volcano Engine (火山引擎) Doubao APIs.

Provides:
- TTS: text-to-speech via Volcano Engine TTS API
- ASR file transcription: audio file → text via 录音文件识别2.0
- Streaming ASR: real-time audio stream → text via WebSocket

Current implementation uses placeholder/mock responses where actual API
integration is complex.  The public interface is stable and ready for
real integration.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import AsyncIterator

from core.config import settings

logger = logging.getLogger(__name__)


class VoiceService:
    """Encapsulates Volcano Engine voice API calls."""

    def __init__(self) -> None:
        self.app_id = settings.VOLCANO_APP_ID
        self.access_token = settings.VOLCANO_ACCESS_TOKEN
        self.tts_resource_id = settings.VOLCANO_TTS_RESOURCE_ID
        self.asr_stream_resource_id = settings.VOLCANO_ASR_STREAM_RESOURCE_ID
        self.tts_ws_url = settings.VOLCANO_TTS_WS_URL
        self.asr_ws_url = settings.VOLCANO_ASR_WS_URL

    # ------------------------------------------------------------------
    # TTS – Text-to-Speech
    # ------------------------------------------------------------------

    async def text_to_speech(
        self,
        text: str,
        speed: float = 1.0,
        voice_type: str = "zh_female_cancan",
    ) -> bytes:
        """Convert *text* to audio bytes (MP3).

        In production this would POST to the Volcano Engine TTS WebSocket
        or HTTP endpoint.  For now returns a minimal valid MP3 frame so
        callers can exercise the full request/response cycle.

        Args:
            text: The text to synthesise.
            speed: Playback speed ratio (0.5 – 2.0).
            voice_type: Volcano Engine voice identifier.

        Returns:
            Raw audio bytes (MP3).
        """
        if not text or not text.strip():
            raise ValueError("text must not be empty")

        if speed < 0.5 or speed > 2.0:
            raise ValueError("speed must be between 0.5 and 2.0")

        logger.info(
            "TTS request: text=%r speed=%.1f voice=%s",
            text[:50],
            speed,
            voice_type,
        )

        # --- Placeholder: return a minimal silent MP3 frame ---
        # A real implementation would call:
        #   POST wss://openspeech.bytedance.com/api/v1/tts/ws
        # with app_id, access_token, text, speed, voice_type, etc.
        audio_bytes = self._generate_placeholder_audio(text)
        return audio_bytes

    # ------------------------------------------------------------------
    # ASR – File Transcription (录音文件识别 2.0)
    # ------------------------------------------------------------------

    async def transcribe_file(
        self,
        audio_data: bytes,
        audio_format: str = "mp3",
        language: str = "zh-CN",
    ) -> str:
        """Transcribe an audio file to text.

        In production this would POST to the Volcano Engine batch ASR
        endpoint (录音文件识别 2.0).

        Args:
            audio_data: Raw audio file bytes.
            audio_format: Audio format (mp3, wav, pcm, etc.).
            language: BCP-47 language tag.

        Returns:
            Transcribed text string.
        """
        if not audio_data:
            raise ValueError("audio_data must not be empty")

        logger.info(
            "ASR file transcription: format=%s lang=%s size=%d bytes",
            audio_format,
            language,
            len(audio_data),
        )

        # --- Placeholder response ---
        # A real implementation would:
        # 1. POST audio to Volcano Engine ASR batch endpoint
        # 2. Poll for result or use callback
        # 3. Return the transcribed text
        return "这是语音转写的占位文本"

    # ------------------------------------------------------------------
    # Streaming ASR – Real-time speech recognition
    # ------------------------------------------------------------------

    async def stream_asr(
        self,
        audio_chunks: AsyncIterator[bytes],
        audio_format: str = "pcm",
        sample_rate: int = 16000,
        language: str = "zh-CN",
    ) -> AsyncIterator[dict]:
        """Stream audio chunks and yield partial/final transcription results.

        In production this would open a WebSocket to the Volcano Engine
        streaming ASR endpoint and forward audio frames.

        Args:
            audio_chunks: Async iterator of raw audio bytes.
            audio_format: Audio encoding (pcm, opus, etc.).
            sample_rate: Sample rate in Hz.
            language: BCP-47 language tag.

        Yields:
            Dicts with keys ``{"text": str, "is_final": bool, "sequence": int}``.
        """
        logger.info(
            "Streaming ASR started: format=%s rate=%d lang=%s",
            audio_format,
            sample_rate,
            language,
        )

        sequence = 0
        async for chunk in audio_chunks:
            if not chunk:
                continue
            sequence += 1
            # --- Placeholder: echo a dummy partial result per chunk ---
            yield {
                "text": f"识别中... (片段 {sequence})",
                "is_final": False,
                "sequence": sequence,
            }
            # Small delay to simulate processing
            await asyncio.sleep(0.05)

        # Final result
        yield {
            "text": "这是流式语音识别的占位结果",
            "is_final": True,
            "sequence": sequence + 1,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_placeholder_audio(text: str) -> bytes:
        """Return a minimal valid MP3 frame (silent) for placeholder use.

        This is a 144-byte MPEG-1 Layer 3 frame at 128 kbps / 44100 Hz
        containing silence.  It is enough for clients to receive a valid
        audio/mpeg response without hitting a real TTS service.
        """
        # Minimal MP3 frame header (sync word 0xFFE2) + padding
        # This produces a technically valid but silent MP3 frame.
        header = bytes([
            0xFF, 0xFB, 0x90, 0x00,  # MPEG1 Layer3 128kbps 44100Hz stereo
        ])
        # Pad to a full frame (417 bytes for 128kbps/44100Hz)
        frame = header + b"\x00" * 413
        return frame


# Module-level singleton
voice_service = VoiceService()
