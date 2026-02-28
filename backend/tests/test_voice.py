"""Task 6.5 — 验证后端语音处理API

Tests:
- POST /api/v1/voice/tts: 文字转语音
- POST /api/v1/voice/transcribe: 录音文件转写
- WebSocket /api/v1/voice/stream-asr: 流式语音识别
- VoiceService unit tests

Requirements: 5.6, 5.7, 19.4
"""

import asyncio
import io
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from core.middleware import require_auth
from main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Auth override
# ---------------------------------------------------------------------------

_MOCK_USER = {"user_id": "user-voice-test", "role": "elder"}


async def _override_require_auth():
    return _MOCK_USER


@pytest.fixture(autouse=True)
def _bypass_auth():
    """Override require_auth dependency at the FastAPI level."""
    app.dependency_overrides[require_auth] = _override_require_auth
    yield
    app.dependency_overrides.pop(require_auth, None)


# ===================================================================
# POST /api/v1/voice/tts
# ===================================================================


class TestTTS:
    """Tests for the text-to-speech endpoint."""

    def test_tts_success(self):
        """Valid TTS request returns audio/mpeg content."""
        with patch(
            "api.v1.ai_voice.voice_service.text_to_speech",
            new_callable=AsyncMock,
            return_value=b"\xff\xfb\x90\x00" + b"\x00" * 100,
        ):
            resp = client.post(
                "/api/v1/voice/tts",
                json={"text": "你好世界", "speed": 1.0},
            )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "audio/mpeg"
        assert len(resp.content) > 0

    def test_tts_default_speed(self):
        """Speed defaults to 1.0 when omitted."""
        with patch(
            "api.v1.ai_voice.voice_service.text_to_speech",
            new_callable=AsyncMock,
            return_value=b"\xff\xfb\x90\x00",
        ) as mock_tts:
            resp = client.post(
                "/api/v1/voice/tts",
                json={"text": "测试"},
            )
        assert resp.status_code == 200
        mock_tts.assert_called_once_with(text="测试", speed=1.0)

    def test_tts_custom_speed(self):
        """Custom speed value is forwarded to the service."""
        with patch(
            "api.v1.ai_voice.voice_service.text_to_speech",
            new_callable=AsyncMock,
            return_value=b"\xff\xfb\x90\x00",
        ) as mock_tts:
            resp = client.post(
                "/api/v1/voice/tts",
                json={"text": "慢速", "speed": 0.8},
            )
        assert resp.status_code == 200
        mock_tts.assert_called_once_with(text="慢速", speed=0.8)

    def test_tts_empty_text_rejected(self):
        """Empty text should be rejected with 422."""
        resp = client.post(
            "/api/v1/voice/tts",
            json={"text": "", "speed": 1.0},
        )
        assert resp.status_code == 422

    def test_tts_speed_out_of_range(self):
        """Speed outside 0.5–2.0 should be rejected with 422."""
        resp = client.post(
            "/api/v1/voice/tts",
            json={"text": "测试", "speed": 3.0},
        )
        assert resp.status_code == 422

    def test_tts_service_error_returns_500(self):
        """Internal service error returns 500."""
        with patch(
            "api.v1.ai_voice.voice_service.text_to_speech",
            new_callable=AsyncMock,
            side_effect=RuntimeError("boom"),
        ):
            resp = client.post(
                "/api/v1/voice/tts",
                json={"text": "测试", "speed": 1.0},
            )
        assert resp.status_code == 500
        assert "不可用" in resp.json()["detail"]


# ===================================================================
# POST /api/v1/voice/transcribe
# ===================================================================


class TestTranscribe:
    """Tests for the audio file transcription endpoint."""

    def test_transcribe_success(self):
        """Valid audio upload returns transcribed text."""
        with patch(
            "api.v1.ai_voice.voice_service.transcribe_file",
            new_callable=AsyncMock,
            return_value="你好世界",
        ):
            audio_content = b"\x00" * 1024
            resp = client.post(
                "/api/v1/voice/transcribe",
                files={"file": ("test.mp3", io.BytesIO(audio_content), "audio/mpeg")},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["text"] == "你好世界"

    def test_transcribe_wav_format(self):
        """WAV files are accepted."""
        with patch(
            "api.v1.ai_voice.voice_service.transcribe_file",
            new_callable=AsyncMock,
            return_value="测试结果",
        ) as mock_asr:
            audio_content = b"\x00" * 512
            resp = client.post(
                "/api/v1/voice/transcribe",
                files={"file": ("recording.wav", io.BytesIO(audio_content), "audio/wav")},
            )
        assert resp.status_code == 200
        mock_asr.assert_called_once()
        assert mock_asr.call_args.kwargs["audio_format"] == "wav"

    def test_transcribe_empty_file_rejected(self):
        """Empty audio file returns 400."""
        resp = client.post(
            "/api/v1/voice/transcribe",
            files={"file": ("empty.mp3", io.BytesIO(b""), "audio/mpeg")},
        )
        assert resp.status_code == 400
        assert "为空" in resp.json()["detail"]

    def test_transcribe_unsupported_format(self):
        """Unsupported content type returns 400."""
        resp = client.post(
            "/api/v1/voice/transcribe",
            files={"file": ("doc.pdf", io.BytesIO(b"data"), "application/pdf")},
        )
        assert resp.status_code == 400
        assert "不支持" in resp.json()["detail"]

    def test_transcribe_service_error_returns_500(self):
        """Internal service error returns 500."""
        with patch(
            "api.v1.ai_voice.voice_service.transcribe_file",
            new_callable=AsyncMock,
            side_effect=RuntimeError("service down"),
        ):
            resp = client.post(
                "/api/v1/voice/transcribe",
                files={"file": ("test.mp3", io.BytesIO(b"\x00" * 100), "audio/mpeg")},
            )
        assert resp.status_code == 500
        assert "不可用" in resp.json()["detail"]


# ===================================================================
# WebSocket /api/v1/voice/stream-asr
# ===================================================================


class TestStreamASR:
    """Tests for the streaming ASR WebSocket endpoint."""

    def test_stream_asr_basic_flow(self):
        """Send audio chunks, receive partial results, then final result."""

        async def _mock_stream_asr(audio_chunks, **kwargs):
            seq = 0
            async for chunk in audio_chunks:
                seq += 1
                yield {"text": f"partial {seq}", "is_final": False, "sequence": seq}
            yield {"text": "final result", "is_final": True, "sequence": seq + 1}

        with patch(
            "api.v1.ai_voice.voice_service.stream_asr",
            side_effect=_mock_stream_asr,
        ):
            with client.websocket_connect("/api/v1/voice/stream-asr") as ws:
                # Send two audio chunks
                ws.send_bytes(b"\x00" * 320)
                ws.send_bytes(b"\x00" * 320)
                # Signal end
                ws.send_text("END")

                results = []
                while True:
                    try:
                        data = ws.receive_json()
                        results.append(data)
                        if data.get("is_final"):
                            break
                    except Exception:
                        break

        assert len(results) >= 2
        # Last result should be final
        assert results[-1]["is_final"] is True
        assert results[-1]["text"] == "final result"

    def test_stream_asr_empty_end(self):
        """Sending END immediately yields only the final result."""

        async def _mock_stream_asr(audio_chunks, **kwargs):
            async for _ in audio_chunks:
                pass
            yield {"text": "", "is_final": True, "sequence": 1}

        with patch(
            "api.v1.ai_voice.voice_service.stream_asr",
            side_effect=_mock_stream_asr,
        ):
            with client.websocket_connect("/api/v1/voice/stream-asr") as ws:
                ws.send_text("END")
                data = ws.receive_json()
                assert data["is_final"] is True


# ===================================================================
# VoiceService unit tests (synchronous wrappers)
# ===================================================================


def _run(coro):
    """Run an async coroutine synchronously."""
    return asyncio.run(coro)


class TestVoiceService:
    """Unit tests for the VoiceService class itself."""

    def test_tts_returns_bytes(self):
        from services.voice_service import VoiceService

        svc = VoiceService()
        result = _run(svc.text_to_speech("你好", speed=1.0))
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_tts_empty_text_raises(self):
        from services.voice_service import VoiceService

        svc = VoiceService()
        with pytest.raises(ValueError, match="empty"):
            _run(svc.text_to_speech("", speed=1.0))

    def test_tts_whitespace_only_raises(self):
        from services.voice_service import VoiceService

        svc = VoiceService()
        with pytest.raises(ValueError, match="empty"):
            _run(svc.text_to_speech("   ", speed=1.0))

    def test_tts_invalid_speed_raises(self):
        from services.voice_service import VoiceService

        svc = VoiceService()
        with pytest.raises(ValueError, match="speed"):
            _run(svc.text_to_speech("test", speed=5.0))

    def test_transcribe_returns_string(self):
        from services.voice_service import VoiceService

        svc = VoiceService()
        result = _run(svc.transcribe_file(b"\x00" * 100))
        assert isinstance(result, str)
        assert len(result) > 0

    def test_transcribe_empty_raises(self):
        from services.voice_service import VoiceService

        svc = VoiceService()
        with pytest.raises(ValueError, match="empty"):
            _run(svc.transcribe_file(b""))

    def test_stream_asr_yields_results(self):
        from services.voice_service import VoiceService

        svc = VoiceService()

        async def _run_stream():
            async def _chunks():
                yield b"\x00" * 320
                yield b"\x00" * 320

            results = []
            async for r in svc.stream_asr(_chunks()):
                results.append(r)
            return results

        results = _run(_run_stream())

        assert len(results) >= 2
        # Last result should be final
        assert results[-1]["is_final"] is True
        # All results have required keys
        for r in results:
            assert "text" in r
            assert "is_final" in r
            assert "sequence" in r
