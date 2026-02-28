"""Task 11.1 — 验证后端家属绑定API

Tests:
- POST /api/v1/family/generate-code: 生成6位绑定码
- POST /api/v1/family/bind: 输入绑定码建立关系
- GET  /api/v1/family/binds: 获取绑定列表
- PATCH /api/v1/family/binds/{id}: 更新绑定权限
- DELETE /api/v1/family/binds/{id}: 解除绑定

Requirements: 7.1, 7.2, 7.3, 7.4, 7.8
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
_BIND_ID = "bind-001"
_BIND_CODE = "123456"

_PENDING_BIND_ROW = {
    "id": _BIND_ID,
    "elder_id": _ELDER_ID,
    "family_id": None,
    "relationship": None,
    "permissions": None,
    "bind_code": _BIND_CODE,
    "status": "pending",
    "created_at": "2024-06-01T10:00:00+00:00",
    "updated_at": None,
}

_ACTIVE_BIND_ROW = {
    "id": _BIND_ID,
    "elder_id": _ELDER_ID,
    "family_id": _FAMILY_ID,
    "relationship": "女儿",
    "permissions": {
        "view_health_data": True,
        "edit_medication_plans": False,
        "receive_emergency_notifications": True,
    },
    "bind_code": _BIND_CODE,
    "status": "active",
    "created_at": "2024-06-01T10:00:00+00:00",
    "updated_at": "2024-06-01T10:05:00+00:00",
}


def _auth_header(user_id: str = _ELDER_ID, role: str = "elder") -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _make_execute(data):
    result = MagicMock()
    result.data = data
    return result


# ---------------------------------------------------------------------------
# POST /api/v1/family/generate-code
# ---------------------------------------------------------------------------


class TestGenerateCode:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/family/generate-code")
        assert resp.status_code == 401

    @patch("api.v1.family.postgrest")
    def test_generate_code_success(self, mock_pg):
        """生成绑定码成功，返回6位数字码和bind_id。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute(
            [_PENDING_BIND_ROW]
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/family/generate-code",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "bind_code" in data
        assert len(data["bind_code"]) == 6
        assert data["bind_code"].isdigit()
        assert "bind_id" in data

    @patch("api.v1.family.postgrest")
    def test_generate_code_db_failure(self, mock_pg):
        """数据库插入失败返回500。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/family/generate-code",
            headers=_auth_header(),
        )
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /api/v1/family/bind
# ---------------------------------------------------------------------------


class TestBind:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/family/bind", json={
            "bind_code": _BIND_CODE,
            "relation": "女儿",
        })
        assert resp.status_code == 401

    @patch("api.v1.family.postgrest")
    def test_bind_success(self, mock_pg):
        """绑定成功，设置family_id、relationship、status=active、默认权限。"""
        # select chain for lookup
        select_tbl = MagicMock()
        select_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([_PENDING_BIND_ROW])
        )

        # update chain
        update_tbl = MagicMock()
        update_tbl.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([_ACTIVE_BIND_ROW])
        )

        call_count = {"n": 0}

        def from_side_effect(table_name):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return select_tbl
            return update_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.post(
            "/api/v1/family/bind",
            json={"bind_code": _BIND_CODE, "relation": "女儿"},
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["elder_id"] == _ELDER_ID
        assert data["family_id"] == _FAMILY_ID
        assert data["relation"] == "女儿"
        assert data["status"] == "active"
        assert data["can_view_health"] is True
        assert data["can_receive_emergency"] is True
        assert data["can_edit_medication"] is False

    @patch("api.v1.family.postgrest")
    def test_bind_invalid_code(self, mock_pg):
        """绑定码无效或已使用返回404。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/family/bind",
            json={"bind_code": "999999", "relation": "儿子"},
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 404

    @patch("api.v1.family.postgrest")
    def test_bind_self(self, mock_pg):
        """不能绑定自己，返回400。"""
        self_bind_row = {**_PENDING_BIND_ROW, "elder_id": _ELDER_ID}
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([self_bind_row])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/family/bind",
            json={"bind_code": _BIND_CODE, "relation": "配偶"},
            headers=_auth_header(user_id=_ELDER_ID, role="elder"),
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/v1/family/binds
# ---------------------------------------------------------------------------


class TestGetBinds:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/family/binds")
        assert resp.status_code == 401

    @patch("api.v1.family.postgrest")
    def test_get_binds_as_elder(self, mock_pg):
        """老年人查询绑定列表。"""
        elder_tbl = MagicMock()
        elder_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([_ACTIVE_BIND_ROW])
        )

        family_tbl = MagicMock()
        family_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )

        call_count = {"n": 0}

        def from_side_effect(table_name):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return elder_tbl
            return family_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.get(
            "/api/v1/family/binds",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == _BIND_ID
        assert data[0]["relation"] == "女儿"
        assert data[0]["can_view_health"] is True

    @patch("api.v1.family.postgrest")
    def test_get_binds_empty(self, mock_pg):
        """无绑定关系返回空列表。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            "/api/v1/family/binds",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json() == []

    @patch("api.v1.family.postgrest")
    def test_get_binds_deduplicates(self, mock_pg):
        """同一条记录在elder和family查询中都出现时去重。"""
        elder_tbl = MagicMock()
        elder_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([_ACTIVE_BIND_ROW])
        )

        family_tbl = MagicMock()
        family_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([_ACTIVE_BIND_ROW])  # same row
        )

        call_count = {"n": 0}

        def from_side_effect(table_name):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return elder_tbl
            return family_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.get(
            "/api/v1/family/binds",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1


# ---------------------------------------------------------------------------
# PATCH /api/v1/family/binds/{id}
# ---------------------------------------------------------------------------


class TestUpdateBind:
    def test_unauthenticated(self):
        resp = client.patch(f"/api/v1/family/binds/{_BIND_ID}", json={
            "can_view_health": False,
        })
        assert resp.status_code == 401

    @patch("api.v1.family.postgrest")
    def test_update_permissions(self, mock_pg):
        """更新绑定权限成功。"""
        updated_row = {
            **_ACTIVE_BIND_ROW,
            "permissions": {
                "view_health_data": False,
                "edit_medication_plans": True,
                "receive_emergency_notifications": True,
            },
        }

        # fetch chain
        fetch_tbl = MagicMock()
        fetch_tbl.select.return_value.eq.return_value.execute.return_value = (
            _make_execute([_ACTIVE_BIND_ROW])
        )

        # update chain
        update_tbl = MagicMock()
        update_tbl.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([updated_row])
        )

        call_count = {"n": 0}

        def from_side_effect(table_name):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return fetch_tbl
            return update_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.patch(
            f"/api/v1/family/binds/{_BIND_ID}",
            json={"can_view_health": False, "can_edit_medication": True},
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["can_view_health"] is False
        assert data["can_edit_medication"] is True
        assert data["can_receive_emergency"] is True

    @patch("api.v1.family.postgrest")
    def test_update_not_found(self, mock_pg):
        """绑定记录不存在返回404。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.patch(
            "/api/v1/family/binds/nonexistent",
            json={"can_view_health": False},
            headers=_auth_header(),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/family/binds/{id}
# ---------------------------------------------------------------------------


class TestDeleteBind:
    def test_unauthenticated(self):
        resp = client.delete(f"/api/v1/family/binds/{_BIND_ID}")
        assert resp.status_code == 401

    @patch("api.v1.family.postgrest")
    def test_delete_success(self, mock_pg):
        """解除绑定成功（软删除）。"""
        inactive_row = {**_ACTIVE_BIND_ROW, "status": "inactive"}
        mock_tbl = MagicMock()
        mock_tbl.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([inactive_row])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.delete(
            f"/api/v1/family/binds/{_BIND_ID}",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "绑定已解除"

    @patch("api.v1.family.postgrest")
    def test_delete_not_found(self, mock_pg):
        """绑定记录不存在返回404。"""
        mock_tbl = MagicMock()
        mock_tbl.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.delete(
            "/api/v1/family/binds/nonexistent",
            headers=_auth_header(),
        )
        assert resp.status_code == 404
