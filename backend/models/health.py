"""健康记录与健康广播 Pydantic 模型，对齐 Supabase health_records / health_broadcasts / broadcast_play_history 表。"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


# ---------- health_records 表 ----------

class HealthRecordBase(BaseModel):
    user_id: str
    record_type: str  # blood_pressure / blood_sugar / heart_rate / weight / temperature
    values: dict[str, Any]
    measured_at: str


class HealthRecordCreate(HealthRecordBase):
    """录入健康数据"""
    input_method: Optional[str] = None  # voice | manual | family
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    symptoms: Optional[str] = None


class HealthRecordResponse(BaseModel):
    id: str
    user_id: str
    record_type: str
    values: dict[str, Any]
    measured_at: str
    input_method: Optional[str] = None
    recorded_by: Optional[str] = None
    is_abnormal: Optional[bool] = None
    abnormal_reason: Optional[str] = None
    notes: Optional[str] = None
    symptoms: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------- health_broadcasts 表 ----------

class HealthBroadcastResponse(BaseModel):
    id: str
    title: str
    content: str
    category: str
    audio_url: Optional[str] = None
    audio_duration: Optional[float] = None
    target_diseases: Optional[list[str]] = None
    target_season: Optional[str] = None
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    is_published: Optional[bool] = None
    play_count: Optional[int] = None
    ai_prompt: Optional[str] = None
    generated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- broadcast_play_history 表 ----------

class BroadcastPlayHistoryCreate(BaseModel):
    """记录播放历史"""
    user_id: str
    broadcast_id: str
    played_at: Optional[datetime] = None
    play_duration: Optional[float] = None
    completed: Optional[bool] = None
    liked: Optional[bool] = None


class BroadcastPlayHistoryResponse(BaseModel):
    id: str
    user_id: str
    broadcast_id: str
    played_at: Optional[datetime] = None
    play_duration: Optional[float] = None
    completed: Optional[bool] = None
    liked: Optional[bool] = None
    created_at: Optional[datetime] = None
