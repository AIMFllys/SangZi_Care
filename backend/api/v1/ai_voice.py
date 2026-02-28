"""Voice processing API endpoints.

- POST /voice/tts          — Text-to-speech (returns audio/mpeg stream)
- POST /voice/transcribe   — Audio file transcription (豆包录音文件识别2.0)
- WebSocket /voice/stream-asr — Real-time streaming ASR

Requirements: 5.6, 5.7, 19.4
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from core.middleware import require_auth
from services.voice_service import voice_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["语音"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="要合成的文本")
    speed: float = Field(1.0, ge=0.5, le=2.0, description="语速倍率 (0.5-2.0)")


class TranscribeResponse(BaseModel):
    text: str = Field(..., description="转写后的文本")


# ---------------------------------------------------------------------------
# POST /voice/tts
# ---------------------------------------------------------------------------


@router.post(
    "/tts",
    summary="文字转语音",
    response_class=StreamingResponse,
    responses={
        200: {"content": {"audio/mpeg": {}}, "description": "MP3 audio stream"},
        400: {"description": "Invalid request parameters"},
    },
)
async def text_to_speech(
    body: TTSRequest,
    _user: dict = Depends(require_auth),
):
    """Convert text to speech audio.

    Returns an MP3 audio stream via ``StreamingResponse``.
    """
    try:
        audio_bytes = await voice_service.text_to_speech(
            text=body.text,
            speed=body.speed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception:
        logger.exception("TTS service error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="语音合成服务暂时不可用",
        )

    async def _stream():
        yield audio_bytes

    return StreamingResponse(
        _stream(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts_output.mp3"},
    )


# ---------------------------------------------------------------------------
# POST /voice/transcribe
# ---------------------------------------------------------------------------


@router.post(
    "/transcribe",
    summary="录音文件转写",
    response_model=TranscribeResponse,
)
async def transcribe_audio(
    file: UploadFile = File(..., description="音频文件 (mp3/wav/pcm)"),
    _user: dict = Depends(require_auth),
):
    """Transcribe an uploaded audio file to text using 豆包录音文件识别2.0."""
    # Validate content type loosely — accept common audio types
    allowed_types = {
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/pcm",
        "audio/webm",
        "audio/ogg",
        "application/octet-stream",
    }
    content_type = (file.content_type or "application/octet-stream").lower()
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的音频格式: {content_type}",
        )

    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="上传的音频文件为空",
        )

    # Determine format from filename extension
    filename = file.filename or "audio.mp3"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "mp3"

    try:
        text = await voice_service.transcribe_file(
            audio_data=audio_data,
            audio_format=ext,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception:
        logger.exception("ASR transcription error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="语音转写服务暂时不可用",
        )

    return TranscribeResponse(text=text)


# ---------------------------------------------------------------------------
# WebSocket /voice/stream-asr
# ---------------------------------------------------------------------------


@router.websocket("/stream-asr")
async def stream_asr(websocket: WebSocket):
    """Real-time streaming ASR over WebSocket.

    Protocol:
    - Client sends binary audio chunks (PCM 16-bit 16kHz mono recommended).
    - Server responds with JSON messages:
        ``{"text": "...", "is_final": false, "sequence": 1}``
    - Client sends a text message ``"END"`` to signal end of audio.
    - Server sends the final transcription result and closes.
    """
    await websocket.accept()
    logger.info("Stream-ASR WebSocket connected")

    async def _audio_chunks():
        """Yield audio chunks received from the WebSocket client."""
        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break
                if "bytes" in message:
                    yield message["bytes"]
                elif "text" in message:
                    if message["text"].strip().upper() == "END":
                        break
                    # Ignore other text messages
        except WebSocketDisconnect:
            pass

    try:
        async for result in voice_service.stream_asr(_audio_chunks()):
            await websocket.send_json(result)
    except WebSocketDisconnect:
        logger.info("Stream-ASR WebSocket disconnected by client")
    except Exception:
        logger.exception("Stream-ASR error")
        try:
            await websocket.send_json({"error": "流式语音识别服务异常"})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
