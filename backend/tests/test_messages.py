"""Task 16.1 — 验证后端捂话消息API

Tests:
- GET  /api/v1/messages/{user_id}: 获取与某人的消息列表
- POST /api/v1/messages/send: 发送文字消息
- POST /api/v1/messages/send-voice: 发送语音消息
- PATCH /api/v1/messages/{id}/read: 标记消息已读
- GET  /api/v1/messages/unread-count: 获取未读消息数

Requirements: 9.3, 9.4, 9.9
"""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from core.security import create_access_token
from main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_ELDER_ID = "elder-001"
_FAMILY_ID = "family-001"
_MSG_ID = "msg-001"
_NOW_ISO = "2024-06-01T10:00:00+00:00"

_TEXT_MSG_ROW = {
    "id": _MSG_ID,
    "sender_id": _ELDER_ID,
    "receiver_id": _FAMILY_ID,
    "type": "text",
    "content": "女儿你好",
    "audio_url": None,
    "audio_duration": None,
    "is_ai_generated": False,
    "is_read": False,
    "read_at": None,
    "created_at": _NOW_ISO,
}

_VOICE_MSG_ROW = {
    "id": "msg-002",
    "sender_id": _ELDER_ID,
    "receiver_id": _FAMILY_ID,
    "type": "voice",
    "content": "周末来看我",
    "audio_url": "https://storage.example.com/voice/abc.wav",
    "audio_duration": 5.2,
    "is_ai_generated": False,
    "is_read": False,
    "read_at": None,
    "created_at": _NOW_ISO,
}

_AI_MSG_ROW = {
    "id": "msg-003",
    "sender_id": _ELDER_ID,
    "receiver_id": _FAMILY_ID,
    "type": "voice",
    "content": "AI生成的捂话",
    "audio_url": "https://storage.example.com/voice/ai.wav",
    "audio_duration": 3.0,
    "is_ai_generated": True,
    "is_read": False,
    "read_at": None,
    "created_at": _NOW_ISO,
}

_READ_MSG_ROW = {
    **_TEXT_MSG_ROW,
    "is_read": True,
    "read_at": _NOW_ISO,
}


def _auth_header(user_id: str = _ELDER_ID, role: str = "elder") -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _make_execute(data, count=None):
    result = MagicMock()
    result.data = data
    result.count = count
    return result


# ---------------------------------------------------------------------------
# GET /api/v1/messages/unread-count
# ---------------------------------------------------------------------------


class TestGetUnreadCount:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/messages/unread-count")
        assert resp.status_code == 401

    @patch("api.v1.messages.postgrest")
    def test_unread_count_success(self, mock_pg):
        """返回当前用户的未读消息数。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([{"id": "1"}, {"id": "2"}, {"id": "3"}], count=3)
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            "/api/v1/messages/unread-count",
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 3

    @patch("api.v1.messages.postgrest")
    def test_unread_count_zero(self, mock_pg):
        """无未读消息时返回0。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([], count=0)
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            "/api/v1/messages/unread-count",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 0


# ---------------------------------------------------------------------------
# GET /api/v1/messages/{user_id}
# ---------------------------------------------------------------------------


class TestGetMessages:
    def test_unauthenticated(self):
        resp = client.get(f"/api/v1/messages/{_FAMILY_ID}")
        assert resp.status_code == 401

    @patch("api.v1.messages.postgrest")
    def test_get_messages_success(self, mock_pg):
        """获取两人之间的消息列表。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.or_.return_value.order.return_value.range.return_value.execute.return_value = (
            _make_execute([_TEXT_MSG_ROW, _VOICE_MSG_ROW])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            f"/api/v1/messages/{_FAMILY_ID}",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["type"] == "text"
        assert data[0]["content"] == "女儿你好"
        assert data[1]["type"] == "voice"
        assert data[1]["audio_url"] is not None

    @patch("api.v1.messages.postgrest")
    def test_get_messages_empty(self, mock_pg):
        """无消息时返回空列表。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.or_.return_value.order.return_value.range.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            f"/api/v1/messages/{_FAMILY_ID}",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json() == []

    @patch("api.v1.messages.postgrest")
    def test_get_messages_with_pagination(self, mock_pg):
        """支持 limit 和 offset 分页参数。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.or_.return_value.order.return_value.range.return_value.execute.return_value = (
            _make_execute([_TEXT_MSG_ROW])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            f"/api/v1/messages/{_FAMILY_ID}?limit=10&offset=5",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        # Verify range was called with correct offset
        mock_tbl.select.return_value.or_.return_value.order.return_value.range.assert_called_once_with(5, 14)


# ---------------------------------------------------------------------------
# POST /api/v1/messages/send
# ---------------------------------------------------------------------------


class TestSendMessage:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/messages/send", json={
            "sender_id": _ELDER_ID,
            "receiver_id": _FAMILY_ID,
            "type": "text",
            "content": "你好",
        })
        assert resp.status_code == 401

    @patch("api.v1.messages.postgrest")
    def test_send_text_message_success(self, mock_pg):
        """发送文字消息成功。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([_TEXT_MSG_ROW])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/messages/send",
            json={
                "sender_id": _ELDER_ID,
                "receiver_id": _FAMILY_ID,
                "type": "text",
                "content": "女儿你好",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "text"
        assert data["content"] == "女儿你好"
        assert data["sender_id"] == _ELDER_ID
        assert data["receiver_id"] == _FAMILY_ID

    @patch("api.v1.messages.postgrest")
    def test_send_message_overrides_sender_id(self, mock_pg):
        """sender_id 从 Token 获取，忽略客户端提供的值。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([_TEXT_MSG_ROW])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/messages/send",
            json={
                "sender_id": "fake-user-id",  # should be overridden
                "receiver_id": _FAMILY_ID,
                "type": "text",
                "content": "你好",
            },
            headers=_auth_header(user_id=_ELDER_ID),
        )
        assert resp.status_code == 201
        # Verify the insert was called with the auth user's ID
        insert_call = mock_tbl.insert.call_args
        inserted_record = insert_call[0][0]
        assert inserted_record["sender_id"] == _ELDER_ID

    @patch("api.v1.messages.postgrest")
    def test_send_ai_generated_message(self, mock_pg):
        """AI生成消息时 is_ai_generated 为 true。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([_AI_MSG_ROW])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/messages/send",
            json={
                "sender_id": _ELDER_ID,
                "receiver_id": _FAMILY_ID,
                "type": "text",
                "content": "AI生成的捂话",
                "is_ai_generated": True,
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        # Verify is_ai_generated was passed to insert
        insert_call = mock_tbl.insert.call_args
        inserted_record = insert_call[0][0]
        assert inserted_record["is_ai_generated"] is True

    @patch("api.v1.messages.postgrest")
    def test_send_message_db_failure(self, mock_pg):
        """数据库插入失败返回500。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/messages/send",
            json={
                "sender_id": _ELDER_ID,
                "receiver_id": _FAMILY_ID,
                "type": "text",
                "content": "你好",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /api/v1/messages/send-voice
# ---------------------------------------------------------------------------


class TestSendVoiceMessage:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/messages/send-voice", json={
            "sender_id": _ELDER_ID,
            "receiver_id": _FAMILY_ID,
            "type": "voice",
        })
        assert resp.status_code == 401

    @patch("api.v1.messages.postgrest")
    def test_send_voice_message_success(self, mock_pg):
        """发送语音消息成功。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([_VOICE_MSG_ROW])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/messages/send-voice",
            json={
                "sender_id": _ELDER_ID,
                "receiver_id": _FAMILY_ID,
                "type": "voice",
                "content": "周末来看我",
                "audio_url": "https://storage.example.com/voice/abc.wav",
                "audio_duration": 5.2,
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "voice"
        assert data["audio_url"] is not None
        assert data["audio_duration"] == 5.2
        assert data["content"] == "周末来看我"

    @patch("api.v1.messages.postgrest")
    def test_send_voice_overrides_sender_id(self, mock_pg):
        """语音消息的 sender_id 也从 Token 获取。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([_VOICE_MSG_ROW])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/messages/send-voice",
            json={
                "sender_id": "fake-id",
                "receiver_id": _FAMILY_ID,
                "type": "voice",
                "audio_url": "https://storage.example.com/voice/abc.wav",
                "audio_duration": 5.2,
            },
            headers=_auth_header(user_id=_ELDER_ID),
        )
        assert resp.status_code == 201
        insert_call = mock_tbl.insert.call_args
        inserted_record = insert_call[0][0]
        assert inserted_record["sender_id"] == _ELDER_ID

    @patch("api.v1.messages.postgrest")
    def test_send_voice_without_content(self, mock_pg):
        """语音消息可以没有文字内容（转写可后续完成）。"""
        row_no_content = {**_VOICE_MSG_ROW, "content": None}
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([row_no_content])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/messages/send-voice",
            json={
                "sender_id": _ELDER_ID,
                "receiver_id": _FAMILY_ID,
                "type": "voice",
                "audio_url": "https://storage.example.com/voice/abc.wav",
                "audio_duration": 3.0,
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201

    @patch("api.v1.messages.postgrest")
    def test_send_voice_db_failure(self, mock_pg):
        """数据库插入失败返回500。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/messages/send-voice",
            json={
                "sender_id": _ELDER_ID,
                "receiver_id": _FAMILY_ID,
                "type": "voice",
                "audio_url": "https://storage.example.com/voice/abc.wav",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# PATCH /api/v1/messages/{message_id}/read
# ---------------------------------------------------------------------------


class TestMarkAsRead:
    def test_unauthenticated(self):
        resp = client.patch(f"/api/v1/messages/{_MSG_ID}/read")
        assert resp.status_code == 401

    @patch("api.v1.messages.postgrest")
    def test_mark_as_read_success(self, mock_pg):
        """接收者标记消息已读成功。"""
        # First call: fetch message
        fetch_tbl = MagicMock()
        fetch_tbl.select.return_value.eq.return_value.execute.return_value = (
            _make_execute([_TEXT_MSG_ROW])
        )

        # Second call: update message
        update_tbl = MagicMock()
        update_tbl.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([_READ_MSG_ROW])
        )

        call_count = {"n": 0}

        def from_side_effect(table_name):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return fetch_tbl
            return update_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.patch(
            f"/api/v1/messages/{_MSG_ID}/read",
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_read"] is True
        assert data["read_at"] is not None

    @patch("api.v1.messages.postgrest")
    def test_mark_as_read_not_receiver(self, mock_pg):
        """非接收者不能标记已读，返回403。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.execute.return_value = (
            _make_execute([_TEXT_MSG_ROW])
        )
        mock_pg.from_.return_value = mock_tbl

        # sender tries to mark as read — should fail
        resp = client.patch(
            f"/api/v1/messages/{_MSG_ID}/read",
            headers=_auth_header(user_id=_ELDER_ID, role="elder"),
        )
        assert resp.status_code == 403

    @patch("api.v1.messages.postgrest")
    def test_mark_as_read_not_found(self, mock_pg):
        """消息不存在返回404。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.patch(
            "/api/v1/messages/nonexistent/read",
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 404
