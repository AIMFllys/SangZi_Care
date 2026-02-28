"""捂话消息模块 — 消息列表、发送文字/语音消息、已读标记、未读计数。

需求: 9.3, 9.4, 9.9
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.middleware import require_auth
from models.message import (
    MessageCreate,
    MessageResponse,
    VoiceMessageCreate,
)
from services.supabase_client import postgrest

router = APIRouter(prefix="/messages", tags=["捂话消息"])


# ---------------------------------------------------------------------------
# Response models (endpoint-specific)
# ---------------------------------------------------------------------------


class UnreadCountResponse(BaseModel):
    count: int


# ---------------------------------------------------------------------------
# GET /messages/unread-count
# ---------------------------------------------------------------------------


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: dict = Depends(require_auth),
):
    """获取当前用户的未读消息数。"""
    user_id = current_user["user_id"]

    result = (
        postgrest.from_("elder_care_messages")
        .select("id", count="exact")
        .eq("receiver_id", user_id)
        .eq("is_read", False)
        .execute()
    )

    count = result.count if result.count is not None else len(result.data or [])
    return UnreadCountResponse(count=count)


# ---------------------------------------------------------------------------
# GET /messages/{user_id}
# ---------------------------------------------------------------------------


@router.get("/{user_id}", response_model=list[MessageResponse])
async def get_messages(
    user_id: str,
    current_user: dict = Depends(require_auth),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """获取当前用户与指定用户之间的消息列表（按时间正序）。"""
    current_id = current_user["user_id"]

    # Supabase PostgREST supports `or` filter
    result = (
        postgrest.from_("elder_care_messages")
        .select("*")
        .or_(
            f"and(sender_id.eq.{current_id},receiver_id.eq.{user_id}),"
            f"and(sender_id.eq.{user_id},receiver_id.eq.{current_id})"
        )
        .order("created_at", desc=False)
        .range(offset, offset + limit - 1)
        .execute()
    )

    rows = result.data or []
    return [MessageResponse(**row) for row in rows]


# ---------------------------------------------------------------------------
# POST /messages/send
# ---------------------------------------------------------------------------


@router.post("/send", response_model=MessageResponse, status_code=201)
async def send_message(
    body: MessageCreate,
    current_user: dict = Depends(require_auth),
):
    """发送文字消息。sender_id 从认证 Token 中获取，不信任客户端提供的值。"""
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "sender_id": current_user["user_id"],
        "receiver_id": body.receiver_id,
        "type": "text",
        "content": body.content,
        "is_ai_generated": body.is_ai_generated or False,
        "is_read": False,
        "created_at": now,
    }

    result = postgrest.from_("elder_care_messages").insert(record).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="发送消息失败")

    return MessageResponse(**rows[0])


# ---------------------------------------------------------------------------
# POST /messages/send-voice
# ---------------------------------------------------------------------------


@router.post("/send-voice", response_model=MessageResponse, status_code=201)
async def send_voice_message(
    body: VoiceMessageCreate,
    current_user: dict = Depends(require_auth),
):
    """发送语音消息。sender_id 从认证 Token 中获取。"""
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "sender_id": current_user["user_id"],
        "receiver_id": body.receiver_id,
        "type": "voice",
        "content": body.content,
        "audio_url": body.audio_url,
        "audio_duration": body.audio_duration,
        "is_ai_generated": body.is_ai_generated or False,
        "is_read": False,
        "created_at": now,
    }

    result = postgrest.from_("elder_care_messages").insert(record).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="发送语音消息失败")

    return MessageResponse(**rows[0])


# ---------------------------------------------------------------------------
# PATCH /messages/{message_id}/read
# ---------------------------------------------------------------------------


@router.patch("/{message_id}/read", response_model=MessageResponse)
async def mark_as_read(
    message_id: str,
    current_user: dict = Depends(require_auth),
):
    """标记消息为已读。仅消息接收者可以标记。"""
    now = datetime.now(timezone.utc).isoformat()

    # First fetch the message to verify the receiver
    fetch_result = (
        postgrest.from_("elder_care_messages")
        .select("*")
        .eq("id", message_id)
        .execute()
    )
    rows = fetch_result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="消息不存在")

    message = rows[0]
    if message["receiver_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="只有消息接收者可以标记已读")

    # Update the message
    update_result = (
        postgrest.from_("elder_care_messages")
        .update({"is_read": True, "read_at": now})
        .eq("id", message_id)
        .execute()
    )
    updated_rows = update_result.data or []
    if not updated_rows:
        raise HTTPException(status_code=500, detail="标记已读失败")

    return MessageResponse(**updated_rows[0])
