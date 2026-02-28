"""Pydantic 数据模型，与 Supabase 表结构对齐。"""

from .user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserRoleUpdate,
    FamilyBindBase,
    FamilyBindCreate,
    FamilyBindResponse,
    FamilyBindUpdate,
)
from .medicine import (
    MedicationPlanBase,
    MedicationPlanCreate,
    MedicationPlanUpdate,
    MedicationPlanResponse,
    MedicationRecordBase,
    MedicationRecordCreate,
    MedicationRecordResponse,
)
from .health import (
    HealthRecordBase,
    HealthRecordCreate,
    HealthRecordResponse,
    HealthBroadcastResponse,
    BroadcastPlayHistoryCreate,
    BroadcastPlayHistoryResponse,
)
from .message import (
    MessageBase,
    MessageCreate,
    VoiceMessageCreate,
    MessageResponse,
)
from .emergency import (
    EmergencyCallCreate,
    EmergencyCallResponse,
    EmergencyNotifyRequest,
)
from .ai import (
    AIConversationCreate,
    AIConversationResponse,
    IntentRequest,
    IntentResponse,
)

__all__ = [
    # user
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserRoleUpdate",
    "FamilyBindBase",
    "FamilyBindCreate",
    "FamilyBindResponse",
    "FamilyBindUpdate",
    # medicine
    "MedicationPlanBase",
    "MedicationPlanCreate",
    "MedicationPlanUpdate",
    "MedicationPlanResponse",
    "MedicationRecordBase",
    "MedicationRecordCreate",
    "MedicationRecordResponse",
    # health
    "HealthRecordBase",
    "HealthRecordCreate",
    "HealthRecordResponse",
    "HealthBroadcastResponse",
    "BroadcastPlayHistoryCreate",
    "BroadcastPlayHistoryResponse",
    # message
    "MessageBase",
    "MessageCreate",
    "VoiceMessageCreate",
    "MessageResponse",
    # emergency
    "EmergencyCallCreate",
    "EmergencyCallResponse",
    "EmergencyNotifyRequest",
    # ai
    "AIConversationCreate",
    "AIConversationResponse",
    "IntentRequest",
    "IntentResponse",
]
