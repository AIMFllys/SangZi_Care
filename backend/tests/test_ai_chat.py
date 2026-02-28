"""Task 7.2 — AI对话与意图识别API测试

Tests:
- POST /api/v1/ai/chat: 文字对话、保存对话记录、session_id生成
- POST /api/v1/ai/intent: 意图识别返回格式
- GET  /api/v1/ai/summary/{user_id}: 对话摘要
- WebSocket /api/v1/ai/voice-session: 实时语音交互

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 17.1
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from core.security import create_access_token
from main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

USER_ID = "user-abc-123"
USER_ROLE = "elder"


def _auth_headers(user_id: str = USER_ID, role: str = USER_ROLE) -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Postgrest mock helpers
# ---------------------------------------------------------------------------


def _mock_postgrest_insert():
    """Return a mock postgrest that accepts inserts."""
    mock = MagicMock()
    execute_result = MagicMock()
    execute_result.data = [{"id": "conv-1"}]
    mock.from_.return_value.insert.return_value.execute.return_value = execute_result
    return mock


def _mock_postgrest_with_conversations(rows):
    """Return a mock postgrest that returns conversation rows on select."""
    mock = MagicMock()

    # Chain: from_().select().eq().order().limit().execute()
    execute_result = MagicMock()
    execute_result.data = rows
    (
        mock.from_.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
        .limit.return_value
        .execute.return_value
    ) = execute_result

    # Also support inserts
    insert_result = MagicMock()
    insert_result.data = [{"id": "conv-new"}]
    mock.from_.return_value.insert.return_value.execute.return_value = insert_result

    return mock


# ---------------------------------------------------------------------------
# POST /api/v1/ai/chat
# ---------------------------------------------------------------------------


class TestAIChat:
    @patch("api.v1.ai_chat.postgrest")
    @patch("api.v1.ai_chat.doubao_service")
    def test_chat_success(self, mock_doubao, mock_pg):
        mock_doubao.chat = AsyncMock(return_value="您好！我是小护。")
        mock_pg.from_ = _mock_postgrest_insert().from_

        resp = client.post(
            "/api/v1/ai/chat",
            json={
                "messages": [{"role": "user", "content": "你好"}],
            },
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["reply"] == "您好！我是小护。"
        assert "session_id" in data
        assert len(data["session_id"]) > 0

    @patch("api.v1.ai_chat.postgrest")
    @patch("api.v1.ai_chat.doubao_service")
    def test_chat_with_session_id(self, mock_doubao, mock_pg):
        mock_doubao.chat = AsyncMock(return_value="好的。")
        mock_pg.from_ = _mock_postgrest_insert().from_

        resp = client.post(
            "/api/v1/ai/chat",
            json={
                "messages": [{"role": "user", "content": "测试"}],
                "session_id": "my-session-123",
            },
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["session_id"] == "my-session-123"

    @patch("api.v1.ai_chat.postgrest")
    @patch("api.v1.ai_chat.doubao_service")
    def test_chat_saves_conversations(self, mock_doubao, mock_pg):
        """Both user message and assistant reply should be saved."""
        mock_doubao.chat = AsyncMock(return_value="回复内容")

        pg_mock = _mock_postgrest_insert()
        mock_pg.from_ = pg_mock.from_

        resp = client.post(
            "/api/v1/ai/chat",
            json={
                "messages": [{"role": "user", "content": "你好小护"}],
            },
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        # insert should be called twice: once for user msg, once for assistant
        assert pg_mock.from_.return_value.insert.call_count == 2

    @patch("api.v1.ai_chat.postgrest")
    @patch("api.v1.ai_chat.doubao_service")
    def test_chat_multi_turn(self, mock_doubao, mock_pg):
        """Multi-turn conversation should pass all messages to LLM."""
        mock_doubao.chat = AsyncMock(return_value="多轮回复")
        mock_pg.from_ = _mock_postgrest_insert().from_

        resp = client.post(
            "/api/v1/ai/chat",
            json={
                "messages": [
                    {"role": "user", "content": "你好"},
                    {"role": "assistant", "content": "你好！"},
                    {"role": "user", "content": "今天天气怎么样"},
                ],
            },
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        # Verify chat was called with all messages
        call_args = mock_doubao.chat.call_args
        messages_arg = call_args[0][0]
        assert len(messages_arg) == 3

    def test_chat_requires_auth(self):
        resp = client.post(
            "/api/v1/ai/chat",
            json={"messages": [{"role": "user", "content": "test"}]},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/ai/intent
# ---------------------------------------------------------------------------


class TestAIIntent:
    @patch("api.v1.ai_chat.doubao_service")
    def test_intent_health_record(self, mock_doubao):
        mock_doubao.recognize_intent = AsyncMock(return_value={
            "intent": "health_record",
            "entities": {"record_type": "blood_pressure", "values": {"systolic": 135, "diastolic": 88}},
            "confidence": 0.95,
        })

        resp = client.post(
            "/api/v1/ai/intent",
            json={"text": "高压135低压88"},
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["intent"] == "health_record"
        assert data["confidence"] == 0.95
        assert "systolic" in data["entities"]["values"]

    @patch("api.v1.ai_chat.doubao_service")
    def test_intent_medication_confirm(self, mock_doubao):
        mock_doubao.recognize_intent = AsyncMock(return_value={
            "intent": "medication_confirm",
            "entities": {},
            "confidence": 0.9,
        })

        resp = client.post(
            "/api/v1/ai/intent",
            json={"text": "我吃了药了"},
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["intent"] == "medication_confirm"

    @patch("api.v1.ai_chat.doubao_service")
    def test_intent_emergency(self, mock_doubao):
        mock_doubao.recognize_intent = AsyncMock(return_value={
            "intent": "emergency",
            "entities": {},
            "confidence": 0.98,
        })

        resp = client.post(
            "/api/v1/ai/intent",
            json={"text": "救命"},
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["intent"] == "emergency"
        assert data["confidence"] == 0.98

    @patch("api.v1.ai_chat.doubao_service")
    def test_intent_send_message(self, mock_doubao):
        mock_doubao.recognize_intent = AsyncMock(return_value={
            "intent": "send_message",
            "entities": {"target_relation": "女儿", "message_content": "周末来看我"},
            "confidence": 0.92,
        })

        resp = client.post(
            "/api/v1/ai/intent",
            json={"text": "给我女儿捂个话，让她周末来看我"},
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["intent"] == "send_message"
        assert data["entities"]["target_relation"] == "女儿"

    @patch("api.v1.ai_chat.doubao_service")
    def test_intent_general_chat(self, mock_doubao):
        mock_doubao.recognize_intent = AsyncMock(return_value={
            "intent": "general_chat",
            "entities": {"topic": "天气"},
            "confidence": 0.85,
        })

        resp = client.post(
            "/api/v1/ai/intent",
            json={"text": "今天天气怎么样"},
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["intent"] == "general_chat"

    @patch("api.v1.ai_chat.doubao_service")
    def test_intent_response_structure(self, mock_doubao):
        """Response must contain intent, entities, and confidence."""
        mock_doubao.recognize_intent = AsyncMock(return_value={
            "intent": "query_health",
            "entities": {"record_type": "blood_pressure"},
            "confidence": 0.88,
        })

        resp = client.post(
            "/api/v1/ai/intent",
            json={"text": "我血压怎么样"},
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "intent" in data
        assert "entities" in data
        assert "confidence" in data
        assert isinstance(data["entities"], dict)
        assert isinstance(data["confidence"], float)

    def test_intent_requires_auth(self):
        resp = client.post(
            "/api/v1/ai/intent",
            json={"text": "test"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/ai/summary/{user_id}
# ---------------------------------------------------------------------------


class TestAISummary:
    @patch("api.v1.ai_chat.postgrest")
    @patch("api.v1.ai_chat.doubao_service")
    def test_summary_success(self, mock_doubao, mock_pg):
        mock_doubao.generate_summary = AsyncMock(
            return_value="老人今天心情不错，关心了血压情况。"
        )

        rows = [
            {"role": "assistant", "content": "您的血压正常。", "created_at": "2024-01-01T10:01:00"},
            {"role": "user", "content": "我血压怎么样", "created_at": "2024-01-01T10:00:00"},
        ]
        mock_pg.from_ = _mock_postgrest_with_conversations(rows).from_

        resp = client.get(
            "/api/v1/ai/summary/user-abc-123",
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data
        assert data["message_count"] == 2
        assert len(data["summary"]) > 0

    @patch("api.v1.ai_chat.postgrest")
    def test_summary_no_conversations(self, mock_pg):
        mock_pg.from_ = _mock_postgrest_with_conversations([]).from_

        resp = client.get(
            "/api/v1/ai/summary/user-abc-123",
            headers=_auth_headers(),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["message_count"] == 0
        assert data["summary"] == "暂无对话记录"

    def test_summary_requires_auth(self):
        resp = client.get("/api/v1/ai/summary/user-abc-123")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# WebSocket /api/v1/ai/voice-session
# ---------------------------------------------------------------------------


class TestAIVoiceSession:
    @patch("api.v1.ai_chat.postgrest")
    @patch("api.v1.ai_chat.doubao_service")
    def test_websocket_text_message(self, mock_doubao, mock_pg):
        mock_doubao.chat = AsyncMock(return_value="WebSocket回复")
        mock_pg.from_ = _mock_postgrest_insert().from_

        with client.websocket_connect("/api/v1/ai/voice-session") as ws:
            ws.send_json({"type": "text", "content": "你好"})
            data = ws.receive_json()
            assert data["type"] == "reply"
            assert data["content"] == "WebSocket回复"
            assert "session_id" in data

            ws.send_json({"type": "end"})
            end_data = ws.receive_json()
            assert end_data["type"] == "session_end"

    @patch("api.v1.ai_chat.postgrest")
    @patch("api.v1.ai_chat.doubao_service")
    def test_websocket_auth_then_text(self, mock_doubao, mock_pg):
        mock_doubao.chat = AsyncMock(return_value="已认证回复")
        pg_mock = _mock_postgrest_insert()
        mock_pg.from_ = pg_mock.from_

        with client.websocket_connect("/api/v1/ai/voice-session") as ws:
            # Auth first
            ws.send_json({"type": "auth", "user_id": "user-ws-123"})
            auth_resp = ws.receive_json()
            assert auth_resp["type"] == "auth_ok"

            # Send text
            ws.send_json({"type": "text", "content": "测试消息"})
            data = ws.receive_json()
            assert data["type"] == "reply"
            assert data["content"] == "已认证回复"

            # Verify conversations were saved (user is authenticated)
            assert pg_mock.from_.return_value.insert.call_count == 2

            ws.send_json({"type": "end"})
            ws.receive_json()

    @patch("api.v1.ai_chat.doubao_service")
    def test_websocket_empty_content(self, mock_doubao):
        with client.websocket_connect("/api/v1/ai/voice-session") as ws:
            ws.send_json({"type": "text", "content": ""})
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "Empty" in data["message"]

            ws.send_json({"type": "end"})
            ws.receive_json()

    def test_websocket_unknown_type(self):
        with client.websocket_connect("/api/v1/ai/voice-session") as ws:
            ws.send_json({"type": "unknown_type"})
            data = ws.receive_json()
            assert data["type"] == "error"
            assert "Unknown" in data["message"]

            ws.send_json({"type": "end"})
            ws.receive_json()

    @patch("api.v1.ai_chat.doubao_service")
    def test_websocket_end_session(self, mock_doubao):
        with client.websocket_connect("/api/v1/ai/voice-session") as ws:
            ws.send_json({"type": "end"})
            data = ws.receive_json()
            assert data["type"] == "session_end"
            assert "session_id" in data
