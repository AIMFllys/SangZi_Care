"""Task 5.1 — 验证后端用户管理API

Tests:
- GET /api/v1/users/me: 获取当前用户信息、未认证返回401、用户不存在返回404
- PATCH /api/v1/users/me: 更新用户信息、空body返回400
- PATCH /api/v1/users/me/role: 更新角色、无效角色返回422

Requirements: 19.3
"""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from core.security import create_access_token
from main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_USER_ROW = {
    "id": "user-abc",
    "name": "李四",
    "phone": "13900139000",
    "role": "elder",
    "avatar_url": None,
    "birth_date": "1950-03-15",
    "gender": "male",
    "chronic_diseases": ["高血压", "糖尿病"],
    "font_size": None,
    "voice_speed": None,
    "wake_word": None,
    "last_active_at": None,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": None,
}


def _auth_header(user_id: str = "user-abc", role: str = "elder") -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _mock_pg_select(rows: list) -> MagicMock:
    """Return a postgrest mock whose select().eq().execute() returns *rows*."""
    mock = MagicMock()
    execute_result = MagicMock()
    execute_result.data = rows
    mock.from_.return_value.select.return_value.eq.return_value.execute.return_value = execute_result
    return mock


def _mock_pg_update(rows: list) -> MagicMock:
    """Return a postgrest mock whose update().eq().execute() returns *rows*."""
    mock = MagicMock()
    execute_result = MagicMock()
    execute_result.data = rows
    mock.from_.return_value.update.return_value.eq.return_value.execute.return_value = execute_result
    return mock


# ---------------------------------------------------------------------------
# GET /api/v1/users/me
# ---------------------------------------------------------------------------

class TestGetMe:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/users/me")
        assert resp.status_code == 401

    @patch("api.v1.users.postgrest")
    def test_success(self, mock_pg):
        mock_pg.from_ = _mock_pg_select([_USER_ROW]).from_

        resp = client.get("/api/v1/users/me", headers=_auth_header())
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "user-abc"
        assert data["name"] == "李四"
        assert data["phone"] == "13900139000"
        assert data["role"] == "elder"
        assert data["chronic_diseases"] == ["高血压", "糖尿病"]

    @patch("api.v1.users.postgrest")
    def test_user_not_found(self, mock_pg):
        mock_pg.from_ = _mock_pg_select([]).from_

        resp = client.get("/api/v1/users/me", headers=_auth_header())
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/v1/users/me
# ---------------------------------------------------------------------------

class TestUpdateMe:
    def test_unauthenticated(self):
        resp = client.patch("/api/v1/users/me", json={"name": "王五"})
        assert resp.status_code == 401

    @patch("api.v1.users.postgrest")
    def test_update_name(self, mock_pg):
        updated_row = {**_USER_ROW, "name": "王五"}
        mock_pg.from_ = _mock_pg_update([updated_row]).from_

        resp = client.patch(
            "/api/v1/users/me",
            json={"name": "王五"},
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "王五"

    @patch("api.v1.users.postgrest")
    def test_update_multiple_fields(self, mock_pg):
        updated_row = {
            **_USER_ROW,
            "name": "赵六",
            "gender": "female",
            "chronic_diseases": ["高血压"],
        }
        mock_pg.from_ = _mock_pg_update([updated_row]).from_

        resp = client.patch(
            "/api/v1/users/me",
            json={
                "name": "赵六",
                "gender": "female",
                "chronic_diseases": ["高血压"],
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "赵六"
        assert data["gender"] == "female"
        assert data["chronic_diseases"] == ["高血压"]

    def test_empty_body(self):
        resp = client.patch(
            "/api/v1/users/me",
            json={},
            headers=_auth_header(),
        )
        assert resp.status_code == 400
        assert "没有需要更新的字段" in resp.json()["detail"]

    @patch("api.v1.users.postgrest")
    def test_update_user_not_found(self, mock_pg):
        mock_pg.from_ = _mock_pg_update([]).from_

        resp = client.patch(
            "/api/v1/users/me",
            json={"name": "不存在"},
            headers=_auth_header(user_id="ghost"),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/v1/users/me/role
# ---------------------------------------------------------------------------

class TestUpdateRole:
    def test_unauthenticated(self):
        resp = client.patch("/api/v1/users/me/role", json={"role": "family"})
        assert resp.status_code == 401

    @patch("api.v1.users.postgrest")
    def test_switch_to_family(self, mock_pg):
        updated_row = {**_USER_ROW, "role": "family"}
        mock_pg.from_ = _mock_pg_update([updated_row]).from_

        resp = client.patch(
            "/api/v1/users/me/role",
            json={"role": "family"},
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "family"

    @patch("api.v1.users.postgrest")
    def test_switch_to_elder(self, mock_pg):
        updated_row = {**_USER_ROW, "role": "elder"}
        mock_pg.from_ = _mock_pg_update([updated_row]).from_

        resp = client.patch(
            "/api/v1/users/me/role",
            json={"role": "elder"},
            headers=_auth_header(role="family"),
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "elder"

    def test_invalid_role(self):
        resp = client.patch(
            "/api/v1/users/me/role",
            json={"role": "admin"},
            headers=_auth_header(),
        )
        assert resp.status_code == 422

    @patch("api.v1.users.postgrest")
    def test_role_update_user_not_found(self, mock_pg):
        mock_pg.from_ = _mock_pg_update([]).from_

        resp = client.patch(
            "/api/v1/users/me/role",
            json={"role": "family"},
            headers=_auth_header(user_id="ghost"),
        )
        assert resp.status_code == 404
