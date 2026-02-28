"""健康广播 Pydantic 模型，对齐 Supabase health_broadcasts / broadcast_play_history 表。

需求: 11.1, 11.2, 11.3, 11.4, 11.8
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------- health_broadcasts 表 ----------


class BroadcastResponse(BaseModel):
    """健康广播响应模型"""
    id: str
    title: str
    content: str
    category: str
    audio_url: Optional[str] = None
    audio_duration: Optional[float] = None
    play_count: Optional[int] = None
    is_published: Optional[bool] = None
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    target_diseases: Optional[list[str]] = None
    target_season: Optional[str] = None
    ai_prompt: Optional[str] = None
    generated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- broadcast_play_history 表 ----------


class PlayRecordCreate(BaseModel):
    """记录播放历史请求"""
    broadcast_id: str
    play_duration: Optional[float] = None
    completed: Optional[bool] = None
    liked: Optional[bool] = None


class PlayRecordResponse(BaseModel):
    """播放历史响应模型"""
    id: str
    user_id: str
    broadcast_id: str
    played_at: Optional[datetime] = None
    play_duration: Optional[float] = None
    completed: Optional[bool] = None
    liked: Optional[bool] = None
    created_at: Optional[datetime] = None


# ---------- 广播生成请求 ----------


class BroadcastGenerateRequest(BaseModel):
    """生成个性化广播内容请求"""
    category: str
    topic: Optional[str] = None
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    target_diseases: Optional[list[str]] = None
