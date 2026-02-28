"""紧急呼叫模块 — 触发/取消紧急呼叫、通知家属、查询历史。

需求: 10.8, 10.10
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.middleware import require_auth
from models.emergency import EmergencyCallCreate, EmergencyCallResponse, EmergencyNotifyRequest
from services.supabase_client import postgrest

router = APIRouter(prefix="/emergency", tags=["紧急呼叫"])


# ---------------------------------------------------------------------------
# Request models (endpoint-specific)
# ---------------------------------------------------------------------------


class CancelRequest(BaseModel):
    emergency_call_id: str
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# POST /emergency/trigger
# ---------------------------------------------------------------------------


@router.post("/trigger", response_model=EmergencyCallResponse)
async def trigger_emergency(
    body: EmergencyCallCreate,
    current_user: dict = Depends(require_auth),
):
    """触发紧急呼叫。

    1. 在 emergency_calls 表创建记录（status=triggered）
    2. 查询所有拥有 receive_emergency_notifications 权限的已绑定家属
    3. 将家属信息写入 called_contacts / notified_families
    """
    user_id = current_user["user_id"]
    now = datetime.now(timezone.utc).isoformat()

    # Find bound families with emergency notification permission
    binds_result = (
        postgrest.from_("elder_family_binds")
        .select("*")
        .eq("elder_id", user_id)
        .eq("status", "active")
        .execute()
    )
    binds = binds_result.data or []

    # Filter families that have receive_emergency_notifications permission
    notified_family_ids: list[str] = []
    called_contacts: dict = {}
    for bind in binds:
        permissions = bind.get("permissions") or {}
        if permissions.get("receive_emergency_notifications", False):
            family_id = bind["family_id"]
            notified_family_ids.append(family_id)
            called_contacts[family_id] = {
                "relationship": bind.get("relationship"),
                "family_id": family_id,
            }

    # Build the emergency call record
    record = {
        "user_id": user_id,
        "trigger_method": body.trigger_method,
        "status": "triggered",
        "triggered_at": now,
        "notified_families": notified_family_ids,
        "called_contacts": called_contacts,
        "called_numbers": [],
    }
    if body.location is not None:
        record["location"] = body.location

    insert_result = postgrest.from_("emergency_calls").insert(record).execute()
    rows = insert_result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="创建紧急呼叫记录失败")

    return EmergencyCallResponse(**rows[0])


# ---------------------------------------------------------------------------
# POST /emergency/cancel
# ---------------------------------------------------------------------------


@router.post("/cancel", response_model=EmergencyCallResponse)
async def cancel_emergency(
    body: CancelRequest,
    current_user: dict = Depends(require_auth),
):
    """取消紧急呼叫。"""
    user_id = current_user["user_id"]
    now = datetime.now(timezone.utc).isoformat()

    update_data = {
        "status": "cancelled",
        "cancelled_by": user_id,
        "ended_at": now,
    }
    if body.reason:
        update_data["cancel_reason"] = body.reason

    result = (
        postgrest.from_("emergency_calls")
        .update(update_data)
        .eq("id", body.emergency_call_id)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="紧急呼叫记录不存在")

    return EmergencyCallResponse(**rows[0])


# ---------------------------------------------------------------------------
# POST /emergency/notify
# ---------------------------------------------------------------------------


@router.post("/notify", response_model=EmergencyCallResponse)
async def notify_families(
    body: EmergencyNotifyRequest,
    current_user: dict = Depends(require_auth),
):
    """记录家属通知信息到紧急呼叫记录。"""
    now = datetime.now(timezone.utc).isoformat()

    update_data = {
        "notified_families": body.family_ids,
        "notification_sent_at": now,
    }

    result = (
        postgrest.from_("emergency_calls")
        .update(update_data)
        .eq("id", body.emergency_call_id)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="紧急呼叫记录不存在")

    return EmergencyCallResponse(**rows[0])


# ---------------------------------------------------------------------------
# GET /emergency/history
# ---------------------------------------------------------------------------


@router.get("/history", response_model=list[EmergencyCallResponse])
async def get_history(
    current_user: dict = Depends(require_auth),
    limit: int = Query(default=20, ge=1, le=100),
):
    """获取当前用户的紧急呼叫历史，按创建时间倒序。"""
    user_id = current_user["user_id"]

    result = (
        postgrest.from_("emergency_calls")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows = result.data or []

    return [EmergencyCallResponse(**row) for row in rows]
