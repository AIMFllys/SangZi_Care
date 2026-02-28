"""Task 10.1 — 验证后端紧急呼叫API

Tests:
- POST /api/v1/emergency/trigger: 触发紧急呼叫、自动查找有权限的家属
- POST /api/v1/emergency/cancel: 取消紧急呼叫
- POST /api/v1/emergency/notify: 通知家属
- GET  /api/v1/emergency/history: 查询历史记录

Requirements: 10.8, 10.10
"""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from core.security import create_access_token
from main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_USER_ID = "elder-001"

_EMERGENCY_ROW = {
    "id": "emg-001",
    "user_id": _USER_ID,
    "trigger_method": "button",
    "status": "triggered",
    "called_numbers": [],
    "called_contacts": {"family-001": {"relationship": "女儿", "family_id": "family-001"}},
    "notified_families": ["family-001"],
    "location": None,
    "triggered_at": "2024-06-01T10:00:00+00:00",
    "answered_at": None,
    "ended_at": None,
    "cancel_reason": None,
    "cancelled_by": None,
    "recording_url": None,
    "recording_duration": None,
    "notification_sent_at": None,
    "created_at": "2024-06-01T10:00:00+00:00",
}

_BIND_WITH_PERMISSION = {
    "id": "bind-001",
    "elder_id": _USER_ID,
    "family_id": "family-001",
    "relationship": "女儿",
    "permissions": {"receive_emergency_notifications": True},
    "bind_code": "123456",
    "status": "active",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": None,
}

_BIND_WITHOUT_PERMISSION = {
    "id": "bind-002",
    "elder_id": _USER_ID,
    "family_id": "family-002",
    "relationship": "儿子",
    "permissions": {"receive_emergency_notifications": False},
    "bind_code": "654321",
    "status": "active",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": None,
}


def _auth_header(user_id: str = _USER_ID, role: str = "elder") -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Helpers to build postgrest mock chains
# ---------------------------------------------------------------------------


def _make_execute(data):
    """Create a mock execute() result."""
    result = MagicMock()
    result.data = data
    return result


def _build_mock_pg(table_responses: dict) -> MagicMock:
    """Build a postgrest mock that routes by table name.

    table_responses maps table_name -> chain builder function.
    Each chain builder receives the mock table object and wires up the chain.
    """
    mock_pg = MagicMock()

    def from_side_effect(table_name):
        builder = table_responses.get(table_name)
        if builder:
            return builder()
        # Default: return empty
        tbl = MagicMock()
        tbl.select.return_value.eq.return_value.execute.return_value = _make_execute([])
        return tbl

    mock_pg.from_.side_effect = from_side_effect
    return mock_pg


# ---------------------------------------------------------------------------
# POST /api/v1/emergency/trigger
# ---------------------------------------------------------------------------


class TestTriggerEmergency:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/emergency/trigger", json={
            "user_id": _USER_ID,
            "trigger_method": "button",
        })
        assert resp.status_code == 401

    @patch("api.v1.emergency.postgrest")
    def test_trigger_with_bound_families(self, mock_pg):
        """触发紧急呼叫，自动找到有通知权限的家属。"""
        # elder_family_binds select chain
        binds_tbl = MagicMock()
        binds_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([_BIND_WITH_PERMISSION, _BIND_WITHOUT_PERMISSION])
        )

        # emergency_calls insert chain
        calls_tbl = MagicMock()
        calls_tbl.insert.return_value.execute.return_value = _make_execute([_EMERGENCY_ROW])

        call_count = {"n": 0}

        def from_side_effect(table_name):
            if table_name == "elder_family_binds":
                return binds_tbl
            if table_name == "emergency_calls":
                return calls_tbl
            return MagicMock()

        mock_pg.from_.side_effect = from_side_effect

        resp = client.post(
            "/api/v1/emergency/trigger",
            json={"user_id": _USER_ID, "trigger_method": "button"},
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "emg-001"
        assert data["status"] == "triggered"
        assert data["trigger_method"] == "button"
        assert "family-001" in data["notified_families"]

    @patch("api.v1.emergency.postgrest")
    def test_trigger_no_bound_families(self, mock_pg):
        """无绑定家属时仍可触发紧急呼叫。"""
        binds_tbl = MagicMock()
        binds_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )

        row_no_families = {**_EMERGENCY_ROW, "notified_families": [], "called_contacts": {}}
        calls_tbl = MagicMock()
        calls_tbl.insert.return_value.execute.return_value = _make_execute([row_no_families])

        def from_side_effect(table_name):
            if table_name == "elder_family_binds":
                return binds_tbl
            if table_name == "emergency_calls":
                return calls_tbl
            return MagicMock()

        mock_pg.from_.side_effect = from_side_effect

        resp = client.post(
            "/api/v1/emergency/trigger",
            json={"user_id": _USER_ID, "trigger_method": "voice"},
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["notified_families"] == []

    @patch("api.v1.emergency.postgrest")
    def test_trigger_with_location(self, mock_pg):
        """触发时可附带位置信息。"""
        binds_tbl = MagicMock()
        binds_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )

        row_with_loc = {**_EMERGENCY_ROW, "location": {"lat": 39.9, "lng": 116.4}}
        calls_tbl = MagicMock()
        calls_tbl.insert.return_value.execute.return_value = _make_execute([row_with_loc])

        def from_side_effect(table_name):
            if table_name == "elder_family_binds":
                return binds_tbl
            if table_name == "emergency_calls":
                return calls_tbl
            return MagicMock()

        mock_pg.from_.side_effect = from_side_effect

        resp = client.post(
            "/api/v1/emergency/trigger",
            json={
                "user_id": _USER_ID,
                "trigger_method": "button",
                "location": {"lat": 39.9, "lng": 116.4},
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json()["location"] == {"lat": 39.9, "lng": 116.4}


# ---------------------------------------------------------------------------
# POST /api/v1/emergency/cancel
# ---------------------------------------------------------------------------


class TestCancelEmergency:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/emergency/cancel", json={
            "emergency_call_id": "emg-001",
        })
        assert resp.status_code == 401

    @patch("api.v1.emergency.postgrest")
    def test_cancel_success(self, mock_pg):
        cancelled_row = {
            **_EMERGENCY_ROW,
            "status": "cancelled",
            "cancelled_by": _USER_ID,
            "cancel_reason": "误触",
            "ended_at": "2024-06-01T10:01:00+00:00",
        }
        mock = MagicMock()
        mock.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([cancelled_row])
        )
        mock_pg.from_.return_value = mock

        resp = client.post(
            "/api/v1/emergency/cancel",
            json={"emergency_call_id": "emg-001", "reason": "误触"},
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "cancelled"
        assert data["cancel_reason"] == "误触"
        assert data["cancelled_by"] == _USER_ID

    @patch("api.v1.emergency.postgrest")
    def test_cancel_without_reason(self, mock_pg):
        cancelled_row = {
            **_EMERGENCY_ROW,
            "status": "cancelled",
            "cancelled_by": _USER_ID,
        }
        mock = MagicMock()
        mock.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([cancelled_row])
        )
        mock_pg.from_.return_value = mock

        resp = client.post(
            "/api/v1/emergency/cancel",
            json={"emergency_call_id": "emg-001"},
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    @patch("api.v1.emergency.postgrest")
    def test_cancel_not_found(self, mock_pg):
        mock = MagicMock()
        mock.update.return_value.eq.return_value.execute.return_value = _make_execute([])
        mock_pg.from_.return_value = mock

        resp = client.post(
            "/api/v1/emergency/cancel",
            json={"emergency_call_id": "nonexistent"},
            headers=_auth_header(),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/emergency/notify
# ---------------------------------------------------------------------------


class TestNotifyFamilies:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/emergency/notify", json={
            "emergency_call_id": "emg-001",
            "family_ids": ["family-001"],
        })
        assert resp.status_code == 401

    @patch("api.v1.emergency.postgrest")
    def test_notify_success(self, mock_pg):
        notified_row = {
            **_EMERGENCY_ROW,
            "notified_families": ["family-001", "family-002"],
            "notification_sent_at": "2024-06-01T10:00:30+00:00",
        }
        mock = MagicMock()
        mock.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([notified_row])
        )
        mock_pg.from_.return_value = mock

        resp = client.post(
            "/api/v1/emergency/notify",
            json={
                "emergency_call_id": "emg-001",
                "family_ids": ["family-001", "family-002"],
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["notified_families"] == ["family-001", "family-002"]
        assert data["notification_sent_at"] is not None

    @patch("api.v1.emergency.postgrest")
    def test_notify_not_found(self, mock_pg):
        mock = MagicMock()
        mock.update.return_value.eq.return_value.execute.return_value = _make_execute([])
        mock_pg.from_.return_value = mock

        resp = client.post(
            "/api/v1/emergency/notify",
            json={"emergency_call_id": "nonexistent", "family_ids": ["family-001"]},
            headers=_auth_header(),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/v1/emergency/history
# ---------------------------------------------------------------------------


class TestGetHistory:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/emergency/history")
        assert resp.status_code == 401

    @patch("api.v1.emergency.postgrest")
    def test_history_success(self, mock_pg):
        mock = MagicMock()
        mock.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = (
            _make_execute([_EMERGENCY_ROW])
        )
        mock_pg.from_.return_value = mock

        resp = client.get(
            "/api/v1/emergency/history",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == "emg-001"

    @patch("api.v1.emergency.postgrest")
    def test_history_empty(self, mock_pg):
        mock = MagicMock()
        mock.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock

        resp = client.get(
            "/api/v1/emergency/history",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json() == []

    @patch("api.v1.emergency.postgrest")
    def test_history_with_limit(self, mock_pg):
        mock = MagicMock()
        mock.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = (
            _make_execute([_EMERGENCY_ROW])
        )
        mock_pg.from_.return_value = mock

        resp = client.get(
            "/api/v1/emergency/history?limit=5",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        # Verify limit was passed through the chain
        mock.select.return_value.eq.return_value.order.return_value.limit.assert_called_with(5)
