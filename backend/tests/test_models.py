"""验证 Pydantic 模型序列化/反序列化与 Supabase 表结构一致。"""

import json
from datetime import datetime

from models import (
    AIConversationCreate,
    AIConversationResponse,
    BroadcastPlayHistoryCreate,
    BroadcastPlayHistoryResponse,
    EmergencyCallCreate,
    EmergencyCallResponse,
    EmergencyNotifyRequest,
    FamilyBindCreate,
    FamilyBindResponse,
    FamilyBindUpdate,
    HealthBroadcastResponse,
    HealthRecordCreate,
    HealthRecordResponse,
    IntentRequest,
    IntentResponse,
    MedicationPlanCreate,
    MedicationPlanResponse,
    MedicationPlanUpdate,
    MedicationRecordCreate,
    MedicationRecordResponse,
    MessageCreate,
    MessageResponse,
    UserCreate,
    UserResponse,
    UserRoleUpdate,
    UserUpdate,
    VoiceMessageCreate,
)


# ---------- user ----------

class TestUserModels:
    def test_user_create(self):
        u = UserCreate(name="张三", phone="13800138000", role="elder")
        assert u.name == "张三"
        assert u.role == "elder"

    def test_user_update_partial(self):
        u = UserUpdate(name="李四", chronic_diseases=["高血压", "糖尿病"])
        data = u.model_dump(exclude_none=True)
        assert "phone" not in data
        assert data["chronic_diseases"] == ["高血压", "糖尿病"]

    def test_user_response_from_dict(self):
        row = {
            "id": "abc-123",
            "name": "张三",
            "phone": "13800138000",
            "role": "elder",
            "avatar_url": None,
            "created_at": "2024-01-01T00:00:00",
        }
        resp = UserResponse(**row)
        assert resp.id == "abc-123"
        assert isinstance(resp.created_at, datetime)

    def test_user_role_update_valid(self):
        r = UserRoleUpdate(role="family")
        assert r.role == "family"


# ---------- family bind ----------

class TestFamilyBindModels:
    def test_bind_create(self):
        b = FamilyBindCreate(bind_code="123456", relation="女儿")
        assert b.bind_code == "123456"

    def test_bind_update(self):
        b = FamilyBindUpdate(can_view_health=True, can_edit_medication=False)
        data = b.model_dump(exclude_none=True)
        assert data == {"can_view_health": True, "can_edit_medication": False}

    def test_bind_response(self):
        resp = FamilyBindResponse(
            id="b-1",
            elder_id="e-1",
            family_id="f-1",
            relation="儿子",
            status="active",
            can_view_health=True,
        )
        assert resp.status == "active"


# ---------- medication ----------

class TestMedicationModels:
    def test_plan_create(self):
        p = MedicationPlanCreate(
            user_id="u-1",
            medicine_name="阿司匹林",
            dosage="100mg",
            schedule_times=["08:00", "20:00"],
            start_date="2024-01-01",
            repeat_days=[1, 2, 3, 4, 5],
        )
        assert len(p.schedule_times) == 2
        assert p.is_active is True  # default

    def test_plan_update_partial(self):
        p = MedicationPlanUpdate(dosage="200mg")
        data = p.model_dump(exclude_none=True)
        assert data == {"dosage": "200mg"}

    def test_plan_response(self):
        resp = MedicationPlanResponse(
            id="p-1",
            user_id="u-1",
            medicine_name="阿司匹林",
            dosage="100mg",
            schedule_times=["08:00"],
            start_date="2024-01-01",
            created_at="2024-01-01T00:00:00",
        )
        assert isinstance(resp.created_at, datetime)

    def test_record_create(self):
        r = MedicationRecordCreate(
            user_id="u-1",
            plan_id="p-1",
            scheduled_time="08:00",
            status="taken",
            taken_at=datetime(2024, 1, 1, 8, 5),
        )
        assert r.status == "taken"

    def test_record_response(self):
        resp = MedicationRecordResponse(
            id="r-1",
            user_id="u-1",
            plan_id="p-1",
            scheduled_time="08:00",
            status="pending",
        )
        assert resp.delayed_count is None


# ---------- health ----------

class TestHealthModels:
    def test_health_record_create(self):
        h = HealthRecordCreate(
            user_id="u-1",
            record_type="blood_pressure",
            values={"systolic": 135, "diastolic": 88},
            measured_at="2024-01-01T08:00:00",
            input_method="voice",
        )
        assert h.values["systolic"] == 135

    def test_health_record_response(self):
        resp = HealthRecordResponse(
            id="h-1",
            user_id="u-1",
            record_type="heart_rate",
            values={"bpm": 72},
            measured_at="2024-01-01T08:00:00",
            is_abnormal=False,
        )
        assert resp.is_abnormal is False

    def test_broadcast_response(self):
        resp = HealthBroadcastResponse(
            id="br-1",
            title="春季养生",
            content="春天要多喝水...",
            category="季节保健",
            target_diseases=["高血压"],
            is_published=True,
            play_count=42,
        )
        assert resp.play_count == 42

    def test_play_history_create(self):
        h = BroadcastPlayHistoryCreate(
            user_id="u-1",
            broadcast_id="br-1",
            play_duration=120.5,
            completed=True,
        )
        assert h.completed is True


# ---------- message ----------

class TestMessageModels:
    def test_text_message_create(self):
        m = MessageCreate(
            sender_id="u-1",
            receiver_id="u-2",
            type="text",
            content="你好",
        )
        assert m.type == "text"

    def test_voice_message_create(self):
        m = VoiceMessageCreate(
            sender_id="u-1",
            receiver_id="u-2",
            type="voice",
            audio_url="https://storage.example.com/audio.mp3",
            audio_duration=5.2,
        )
        assert m.audio_duration == 5.2

    def test_message_response(self):
        resp = MessageResponse(
            id="m-1",
            sender_id="u-1",
            receiver_id="u-2",
            type="voice",
            audio_url="https://example.com/a.mp3",
            audio_duration=3.0,
            is_read=False,
            created_at="2024-01-01T10:00:00",
        )
        assert resp.is_read is False


# ---------- emergency ----------

class TestEmergencyModels:
    def test_emergency_create(self):
        e = EmergencyCallCreate(
            user_id="u-1",
            trigger_method="button",
            location={"lat": 39.9, "lng": 116.4},
        )
        assert e.trigger_method == "button"

    def test_emergency_response(self):
        resp = EmergencyCallResponse(
            id="ec-1",
            user_id="u-1",
            trigger_method="voice",
            status="triggered",
            called_numbers=["13800138001"],
            notified_families=["f-1", "f-2"],
        )
        assert len(resp.notified_families) == 2

    def test_notify_request(self):
        n = EmergencyNotifyRequest(
            emergency_call_id="ec-1",
            family_ids=["f-1"],
        )
        assert len(n.family_ids) == 1


# ---------- ai ----------

class TestAIModels:
    def test_conversation_create(self):
        c = AIConversationCreate(
            user_id="u-1",
            user_input="高压135低压88",
            ai_response="已为您记录血压数据",
            intent="health_record",
            entities={"systolic": 135, "diastolic": 88},
            action_taken="create_health_record",
        )
        assert c.intent == "health_record"

    def test_conversation_response(self):
        resp = AIConversationResponse(
            id="ai-1",
            user_id="u-1",
            user_input="今天吃什么药",
            ai_response="您今天需要服用阿司匹林100mg",
            session_id="sess-1",
            turn_number=1,
            created_at="2024-01-01T09:00:00",
        )
        assert resp.turn_number == 1

    def test_intent_request(self):
        r = IntentRequest(text="我吃了药了", user_id="u-1")
        assert r.text == "我吃了药了"

    def test_intent_response(self):
        resp = IntentResponse(
            intent="medication_confirm",
            entities={},
            confidence=0.95,
            suggested_action="confirm_medication",
        )
        assert resp.confidence == 0.95

    def test_model_json_serialization(self):
        """验证模型可以正确序列化为 JSON（与 API 响应兼容）"""
        resp = AIConversationResponse(
            id="ai-1",
            user_id="u-1",
            user_input="test",
            ai_response="ok",
            entities={"key": "value"},
            created_at="2024-01-01T00:00:00",
        )
        json_str = resp.model_dump_json()
        parsed = json.loads(json_str)
        assert parsed["id"] == "ai-1"
        assert parsed["entities"] == {"key": "value"}
