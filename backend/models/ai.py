"""AI 对话 Pydantic 模型，对齐 Supabase ai_conversations 表。"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class AIConversationCreate(BaseModel):
    """记录一轮 AI 对话"""
    user_id: str
    user_input: str
    ai_response: str
    session_id: Optional[str] = None
    turn_number: Optional[int] = None
    intent: Optional[str] = None
    entities: Optional[dict[str, Any]] = None
    action_taken: Optional[str] = None
    action_result: Optional[dict[str, Any]] = None
    user_audio_url: Optional[str] = None
    ai_audio_url: Optional[str] = None


class AIConversationResponse(BaseModel):
    id: str
    user_id: str
    session_id: Optional[str] = None
    turn_number: Optional[int] = None
    user_input: str
    ai_response: str
    intent: Optional[str] = None
    entities: Optional[dict[str, Any]] = None
    action_taken: Optional[str] = None
    action_result: Optional[dict[str, Any]] = None
    user_audio_url: Optional[str] = None
    ai_audio_url: Optional[str] = None
    created_at: Optional[datetime] = None


class IntentRequest(BaseModel):
    """意图识别请求"""
    text: str
    user_id: str


class IntentResponse(BaseModel):
    """意图识别结果"""
    intent: str  # health_record | medication_confirm | send_message | make_call | emergency | query_medication | query_health | general_chat
    entities: dict[str, Any]
    confidence: float
    suggested_action: str
