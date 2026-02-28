"""紧急呼叫 Pydantic 模型，对齐 Supabase emergency_calls 表。"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class EmergencyCallCreate(BaseModel):
    """触发紧急呼叫"""
    user_id: str
    trigger_method: str  # button | voice
    location: Optional[dict[str, Any]] = None


class EmergencyCallResponse(BaseModel):
    id: str
    user_id: str
    trigger_method: str
    status: Optional[str] = None  # triggered | calling | answered | cancelled | failed
    called_numbers: Optional[list[str]] = None
    called_contacts: Optional[dict[str, Any]] = None
    notified_families: Optional[list[str]] = None
    location: Optional[dict[str, Any]] = None
    triggered_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    cancelled_by: Optional[str] = None
    recording_url: Optional[str] = None
    recording_duration: Optional[float] = None
    notification_sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class EmergencyNotifyRequest(BaseModel):
    """通知家属"""
    emergency_call_id: str
    family_ids: list[str]
