"""Task 13.1 — 验证后端用药管理API

Tests:
- GET  /api/v1/medicine/plans: 获取用药计划列表
- POST /api/v1/medicine/plans: 创建用药计划
- PATCH /api/v1/medicine/plans/{id}: 更新用药计划
- GET  /api/v1/medicine/today: 获取今日用药时间线
- POST /api/v1/medicine/records: 记录服药
- POST /api/v1/medicine/notify-family: 通知家属

Requirements: 6.9, 6.10, 6.6
"""

from datetime import date
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from core.security import create_access_token
from main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_USER_ID = "user-001"
_FAMILY_ID = "family-001"
_PLAN_ID = "plan-001"

_NOW_ISO = "2024-06-01T10:00:00+00:00"

_PLAN_ROW = {
    "id": _PLAN_ID,
    "user_id": _USER_ID,
    "medicine_name": "阿司匹林",
    "dosage": "100mg",
    "unit": "片",
    "schedule_times": ["08:00", "20:00"],
    "repeat_days": [1, 2, 3, 4, 5, 6, 7],
    "start_date": "2024-01-01",
    "end_date": None,
    "is_active": True,
    "created_by": _FAMILY_ID,
    "notes": "饭后服用",
    "side_effects": None,
    "remind_enabled": True,
    "remind_before_minutes": 10,
    "created_at": _NOW_ISO,
    "updated_at": _NOW_ISO,
}

_RECORD_ROW = {
    "id": "record-001",
    "user_id": _USER_ID,
    "plan_id": _PLAN_ID,
    "scheduled_time": "08:00",
    "status": "taken",
    "taken_at": _NOW_ISO,
    "delayed_count": 0,
    "notes": None,
    "created_at": _NOW_ISO,
}

_ACTIVE_BIND_ROW = {
    "id": "bind-001",
    "elder_id": _USER_ID,
    "family_id": _FAMILY_ID,
    "relationship": "女儿",
    "permissions": {
        "view_health_data": True,
        "edit_medication_plans": True,
        "receive_emergency_notifications": True,
    },
    "status": "active",
}


def _auth_header(user_id: str = _USER_ID, role: str = "elder") -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _make_execute(data):
    result = MagicMock()
    result.data = data
    return result


# ---------------------------------------------------------------------------
# GET /api/v1/medicine/plans
# ---------------------------------------------------------------------------


class TestGetPlans:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/medicine/plans")
        assert resp.status_code == 401

    @patch("api.v1.medicine.postgrest")
    def test_get_plans_success(self, mock_pg):
        """获取活跃用药计划列表。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = (
            _make_execute([_PLAN_ROW])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            "/api/v1/medicine/plans",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["medicine_name"] == "阿司匹林"
        assert data[0]["dosage"] == "100mg"
        assert data[0]["schedule_times"] == ["08:00", "20:00"]

    @patch("api.v1.medicine.postgrest")
    def test_get_plans_with_user_id(self, mock_pg):
        """通过 user_id 查询指定用户的计划。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = (
            _make_execute([_PLAN_ROW])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            f"/api/v1/medicine/plans?user_id={_USER_ID}",
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    @patch("api.v1.medicine.postgrest")
    def test_get_plans_empty(self, mock_pg):
        """无计划返回空列表。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            "/api/v1/medicine/plans",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# POST /api/v1/medicine/plans
# ---------------------------------------------------------------------------


class TestCreatePlan:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/medicine/plans", json={
            "user_id": _USER_ID,
            "medicine_name": "阿司匹林",
            "dosage": "100mg",
            "schedule_times": ["08:00"],
            "start_date": "2024-01-01",
        })
        assert resp.status_code == 401

    @patch("api.v1.medicine.postgrest")
    def test_create_plan_success(self, mock_pg):
        """创建用药计划成功。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([_PLAN_ROW])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/medicine/plans",
            json={
                "user_id": _USER_ID,
                "medicine_name": "阿司匹林",
                "dosage": "100mg",
                "schedule_times": ["08:00", "20:00"],
                "start_date": "2024-01-01",
                "repeat_days": [1, 2, 3, 4, 5, 6, 7],
                "unit": "片",
                "notes": "饭后服用",
            },
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["medicine_name"] == "阿司匹林"
        assert data["dosage"] == "100mg"
        assert data["user_id"] == _USER_ID

    @patch("api.v1.medicine.postgrest")
    def test_create_plan_db_failure(self, mock_pg):
        """数据库插入失败返回500。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/medicine/plans",
            json={
                "user_id": _USER_ID,
                "medicine_name": "阿司匹林",
                "dosage": "100mg",
                "schedule_times": ["08:00"],
                "start_date": "2024-01-01",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# PATCH /api/v1/medicine/plans/{id}
# ---------------------------------------------------------------------------


class TestUpdatePlan:
    def test_unauthenticated(self):
        resp = client.patch(f"/api/v1/medicine/plans/{_PLAN_ID}", json={
            "dosage": "200mg",
        })
        assert resp.status_code == 401

    @patch("api.v1.medicine.postgrest")
    def test_update_plan_success(self, mock_pg):
        """更新用药计划成功。"""
        updated_row = {**_PLAN_ROW, "dosage": "200mg"}
        mock_tbl = MagicMock()
        mock_tbl.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([updated_row])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.patch(
            f"/api/v1/medicine/plans/{_PLAN_ID}",
            json={"dosage": "200mg"},
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["dosage"] == "200mg"

    @patch("api.v1.medicine.postgrest")
    def test_update_plan_not_found(self, mock_pg):
        """计划不存在返回404。"""
        mock_tbl = MagicMock()
        mock_tbl.update.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.patch(
            "/api/v1/medicine/plans/nonexistent",
            json={"dosage": "200mg"},
            headers=_auth_header(),
        )
        assert resp.status_code == 404

    def test_update_plan_empty_body(self):
        """空更新体返回400。"""
        resp = client.patch(
            f"/api/v1/medicine/plans/{_PLAN_ID}",
            json={},
            headers=_auth_header(),
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/v1/medicine/today
# ---------------------------------------------------------------------------


class TestGetTodayTimeline:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/medicine/today")
        assert resp.status_code == 401

    @patch("api.v1.medicine.postgrest")
    def test_today_timeline_with_records(self, mock_pg):
        """今日时间线包含计划和已有服药记录。"""
        today_str = date.today().isoformat()
        today_weekday = date.today().isoweekday()

        # Plan that applies today
        plan_row = {
            **_PLAN_ROW,
            "start_date": "2024-01-01",
            "repeat_days": list(range(1, 8)),  # every day
        }

        # Record for 08:00
        record_row = {
            **_RECORD_ROW,
            "created_at": f"{today_str}T08:30:00",
        }

        # plans query
        plans_tbl = MagicMock()
        plans_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([plan_row])
        )

        # records query
        records_tbl = MagicMock()
        records_tbl.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = (
            _make_execute([record_row])
        )

        call_count = {"n": 0}

        def from_side_effect(table_name):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return plans_tbl
            return records_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.get(
            "/api/v1/medicine/today",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["date"] == today_str
        assert len(data["items"]) == 2  # 08:00 and 20:00

        # 08:00 should be taken
        item_0800 = next(i for i in data["items"] if i["scheduled_time"] == "08:00")
        assert item_0800["status"] == "taken"
        assert item_0800["record"] is not None

        # 20:00 should be pending
        item_2000 = next(i for i in data["items"] if i["scheduled_time"] == "20:00")
        assert item_2000["status"] == "pending"
        assert item_2000["record"] is None

    @patch("api.v1.medicine.postgrest")
    def test_today_timeline_empty(self, mock_pg):
        """无活跃计划时返回空时间线。"""
        plans_tbl = MagicMock()
        plans_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )

        records_tbl = MagicMock()
        records_tbl.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = (
            _make_execute([])
        )

        call_count = {"n": 0}

        def from_side_effect(table_name):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return plans_tbl
            return records_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.get(
            "/api/v1/medicine/today",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []

    @patch("api.v1.medicine.postgrest")
    def test_today_timeline_filters_by_weekday(self, mock_pg):
        """计划的 repeat_days 不包含今天时不出现在时间线中。"""
        today_weekday = date.today().isoweekday()
        # Set repeat_days to exclude today
        excluded_days = [d for d in range(1, 8) if d != today_weekday]

        plan_row = {
            **_PLAN_ROW,
            "repeat_days": excluded_days,
        }

        plans_tbl = MagicMock()
        plans_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([plan_row])
        )

        records_tbl = MagicMock()
        records_tbl.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = (
            _make_execute([])
        )

        call_count = {"n": 0}

        def from_side_effect(table_name):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return plans_tbl
            return records_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.get(
            "/api/v1/medicine/today",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []


# ---------------------------------------------------------------------------
# POST /api/v1/medicine/records
# ---------------------------------------------------------------------------


class TestCreateRecord:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/medicine/records", json={
            "user_id": _USER_ID,
            "plan_id": _PLAN_ID,
            "scheduled_time": "08:00",
            "status": "taken",
        })
        assert resp.status_code == 401

    @patch("api.v1.medicine.postgrest")
    def test_create_record_taken(self, mock_pg):
        """记录服药（taken）成功，自动设置 taken_at。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([_RECORD_ROW])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/medicine/records",
            json={
                "user_id": _USER_ID,
                "plan_id": _PLAN_ID,
                "scheduled_time": "08:00",
                "status": "taken",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "taken"
        assert data["plan_id"] == _PLAN_ID

    @patch("api.v1.medicine.postgrest")
    def test_create_record_delayed(self, mock_pg):
        """记录延迟服药（delayed）。"""
        delayed_row = {**_RECORD_ROW, "status": "delayed", "delayed_count": 1, "taken_at": None}
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([delayed_row])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/medicine/records",
            json={
                "user_id": _USER_ID,
                "plan_id": _PLAN_ID,
                "scheduled_time": "08:00",
                "status": "delayed",
                "delayed_count": 1,
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "delayed"
        assert data["delayed_count"] == 1

    @patch("api.v1.medicine.postgrest")
    def test_create_record_db_failure(self, mock_pg):
        """数据库插入失败返回500。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/medicine/records",
            json={
                "user_id": _USER_ID,
                "plan_id": _PLAN_ID,
                "scheduled_time": "08:00",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /api/v1/medicine/notify-family
# ---------------------------------------------------------------------------


class TestNotifyFamily:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/medicine/notify-family", json={
            "user_id": _USER_ID,
            "plan_id": _PLAN_ID,
            "scheduled_time": "08:00",
        })
        assert resp.status_code == 401

    @patch("api.v1.medicine.postgrest")
    def test_notify_family_success(self, mock_pg):
        """通知有权限的家属成功。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([_ACTIVE_BIND_ROW])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/medicine/notify-family",
            json={
                "user_id": _USER_ID,
                "plan_id": _PLAN_ID,
                "scheduled_time": "08:00",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["notified_count"] == 1
        assert _FAMILY_ID in data["notified_family_ids"]
        assert data["message"] == "已通知家属"

    @patch("api.v1.medicine.postgrest")
    def test_notify_family_no_binds(self, mock_pg):
        """无绑定家属时返回0通知。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/medicine/notify-family",
            json={
                "user_id": _USER_ID,
                "plan_id": _PLAN_ID,
                "scheduled_time": "08:00",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["notified_count"] == 0
        assert data["notified_family_ids"] == []

    @patch("api.v1.medicine.postgrest")
    def test_notify_family_no_permission(self, mock_pg):
        """家属无通知权限时不通知。"""
        bind_no_perm = {
            **_ACTIVE_BIND_ROW,
            "permissions": {
                "view_health_data": True,
                "edit_medication_plans": True,
                "receive_emergency_notifications": False,
            },
        }
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
            _make_execute([bind_no_perm])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/medicine/notify-family",
            json={
                "user_id": _USER_ID,
                "plan_id": _PLAN_ID,
                "scheduled_time": "08:00",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["notified_count"] == 0
