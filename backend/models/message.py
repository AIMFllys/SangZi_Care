"""捂话消息 Pydantic 模型，对齐 Supabase elder_care_messages 表。"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MessageBase(BaseModel):
    sender_id: str
    receiver_id: str
    type: str  # voice | text


class MessageCreate(MessageBase):
    """发送文字消息"""
    content: Optional[str] = None
    is_ai_generated: Optional[bool] = False


class VoiceMessageCreate(MessageBase):
    """发送语音消息（音频上传后填充 audio_url）"""
    content: Optional[str] = None
    audio_url: Optional[str] = None
    audio_duration: Optional[float] = None
    is_ai_generated: Optional[bool] = False


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    type: str
    content: Optional[str] = None
    audio_url: Optional[str] = None
    audio_duration: Optional[float] = None
    is_ai_generated: Optional[bool] = None
    is_read: Optional[bool] = None
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
