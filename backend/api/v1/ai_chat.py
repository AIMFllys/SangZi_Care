"""AI对话模块 — 文字对话、意图识别、对话摘要、实时语音交互。

Endpoints:
- POST /ai/chat          — 文字对话
- POST /ai/intent        — 意图识别
- GET  /ai/summary/{user_id} — 获取对话摘要
- WebSocket /ai/voice-session — 实时语音交互会话

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 17.1
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from core.middleware import require_auth
from services.doubao_service import doubao_service
from services.supabase_client import postgrest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

# ---------------------------------------------------------------------------
# Intent types
# ---------------------------------------------------------------------------

INTENT_TYPES = [
    "health_record",
    "medication_confirm",
    "send_message",
    "make_call",
    "emergency",
    "query_medication",
    "query_health",
    "general_chat",
]

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class IntentRequest(BaseModel):
    text: str


class IntentResponse(BaseModel):
    intent: str
    entities: dict
    confidence: float


class SummaryResponse(BaseModel):
    summary: str
    message_count: int


# ---------------------------------------------------------------------------
# POST /ai/chat
# ---------------------------------------------------------------------------


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest, user: dict = Depends(require_auth)):
    """文字对话：将用户消息发送给豆包LLM，保存对话记录。"""
    user_id = user["user_id"]
    session_id = req.session_id or str(uuid.uuid4())

    # Build messages list for LLM
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    # Get the last user message for saving
    last_user_content = ""
    for m in reversed(req.messages):
        if m.role == "user":
            last_user_content = m.content
            break

    # Call doubao LLM
    reply = await doubao_service.chat(messages, user_id)

    # Save user message to ai_conversations
    if last_user_content:
        postgrest.from_("ai_conversations").insert({
            "user_id": user_id,
            "role": "user",
            "content": last_user_content,
            "session_id": session_id,
        }).execute()

    # Save assistant response to ai_conversations
    postgrest.from_("ai_conversations").insert({
        "user_id": user_id,
        "role": "assistant",
        "content": reply,
        "session_id": session_id,
    }).execute()

    return ChatResponse(reply=reply, session_id=session_id)


# ---------------------------------------------------------------------------
# POST /ai/intent
# ---------------------------------------------------------------------------


@router.post("/intent", response_model=IntentResponse)
async def ai_intent(req: IntentRequest, user: dict = Depends(require_auth)):
    """意图识别：分析用户文本，返回意图类型、实体和置信度。"""
    user_id = user["user_id"]

    result = await doubao_service.recognize_intent(req.text, user_id)

    return IntentResponse(
        intent=result.get("intent", "general_chat"),
        entities=result.get("entities", {}),
        confidence=result.get("confidence", 0.0),
    )


# ---------------------------------------------------------------------------
# GET /ai/summary/{user_id}
# ---------------------------------------------------------------------------


@router.get("/summary/{user_id}", response_model=SummaryResponse)
async def ai_summary(user_id: str, user: dict = Depends(require_auth)):
    """对话摘要：获取用户最近对话的AI摘要。"""
    # Fetch recent conversations from ai_conversations table
    result = (
        postgrest.from_("ai_conversations")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    rows = result.data or []
    message_count = len(rows)

    if message_count == 0:
        return SummaryResponse(summary="暂无对话记录", message_count=0)

    # Build conversation list for summary generation (reverse to chronological)
    conversations = [
        {"role": row.get("role", "user"), "content": row.get("content", "")}
        for row in reversed(rows)
    ]

    summary = await doubao_service.generate_summary(conversations, user_id)

    return SummaryResponse(summary=summary, message_count=message_count)


# ---------------------------------------------------------------------------
# WebSocket /ai/voice-session
# ---------------------------------------------------------------------------


@router.websocket("/voice-session")
async def ai_voice_session(websocket: WebSocket):
    """实时语音交互会话（基础版本：接收文本消息，返回AI回复）。

    Protocol:
    - Client sends JSON: {"type": "text", "content": str, "session_id": str?}
    - Server responds JSON: {"type": "reply", "content": str, "session_id": str}
    - Client sends JSON: {"type": "end"} to close session
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())
    user_id: Optional[str] = None

    logger.info("WebSocket voice-session opened: session=%s", session_id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "end":
                await websocket.send_json({
                    "type": "session_end",
                    "session_id": session_id,
                })
                break

            if msg_type == "auth":
                # Optional auth message to identify user
                user_id = data.get("user_id")
                await websocket.send_json({
                    "type": "auth_ok",
                    "session_id": session_id,
                })
                continue

            if msg_type == "text":
                content = data.get("content", "")
                session_id = data.get("session_id", session_id)

                if not content.strip():
                    await websocket.send_json({
                        "type": "error",
                        "message": "Empty content",
                    })
                    continue

                # Call doubao LLM
                messages = [{"role": "user", "content": content}]
                reply = await doubao_service.chat(messages, user_id)

                # Save conversation if user is identified
                if user_id:
                    postgrest.from_("ai_conversations").insert({
                        "user_id": user_id,
                        "role": "user",
                        "content": content,
                        "session_id": session_id,
                    }).execute()
                    postgrest.from_("ai_conversations").insert({
                        "user_id": user_id,
                        "role": "assistant",
                        "content": reply,
                        "session_id": session_id,
                    }).execute()

                await websocket.send_json({
                    "type": "reply",
                    "content": reply,
                    "session_id": session_id,
                })
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        logger.info("WebSocket voice-session disconnected: session=%s", session_id)
    except Exception as exc:
        logger.error("WebSocket voice-session error: %s", exc)
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(exc),
            })
        except Exception:
            pass
