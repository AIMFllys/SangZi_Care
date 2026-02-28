"""Task 14.1 — 验证后端健康记录API

Tests:
- POST /api/v1/health/records: 录入健康数据 + 异常判定
- GET  /api/v1/health/records: 获取健康记录列表
- GET  /api/v1/health/records/latest: 获取最新各类健康数据
- GET  /api/v1/health/records/trend: 获取趋势数据

Requirements: 8.1, 8.4, 8.5
"""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from core.security import create_access_token
from main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_USER_ID = "user-health-001"
_FAMILY_ID = "family-health-001"
_NOW_ISO = "2024-06-01T10:00:00+00:00"


def _auth_header(user_id: str = _USER_ID, role: str = "elder") -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _make_execute(data):
    result = MagicMock()
    result.data = data
    return result


def _bp_row(systolic=120, diastolic=80, is_abnormal=False, abnormal_reason=None):
    return {
        "id": "rec-bp-001",
        "user_id": _USER_ID,
        "record_type": "blood_pressure",
        "values": {"systolic": systolic, "diastolic": diastolic},
        "measured_at": "2024-06-01T09:00:00",
        "input_method": "manual",
        "recorded_by": None,
        "is_abnormal": is_abnormal,
        "abnormal_reason": abnormal_reason,
        "notes": None,
        "symptoms": None,
        "created_at": _NOW_ISO,
    }


def _bs_row(value=5.5, measurement_type="fasting", is_abnormal=False, abnormal_reason=None):
    return {
        "id": "rec-bs-001",
        "user_id": _USER_ID,
        "record_type": "blood_sugar",
        "values": {"value": value, "measurement_type": measurement_type},
        "measured_at": "2024-06-01T07:00:00",
        "input_method": "voice",
        "recorded_by": None,
        "is_abnormal": is_abnormal,
        "abnormal_reason": abnormal_reason,
        "notes": None,
        "symptoms": None,
        "created_at": _NOW_ISO,
    }


def _hr_row(value=75, is_abnormal=False, abnormal_reason=None):
    return {
        "id": "rec-hr-001",
        "user_id": _USER_ID,
        "record_type": "heart_rate",
        "values": {"value": value},
        "measured_at": "2024-06-01T08:00:00",
        "input_method": "manual",
        "recorded_by": None,
        "is_abnormal": is_abnormal,
        "abnormal_reason": abnormal_reason,
        "notes": None,
        "symptoms": None,
        "created_at": _NOW_ISO,
    }


def _temp_row(value=36.5, is_abnormal=False, abnormal_reason=None):
    return {
        "id": "rec-temp-001",
        "user_id": _USER_ID,
        "record_type": "temperature",
        "values": {"value": value},
        "measured_at": "2024-06-01T08:30:00",
        "input_method": "manual",
        "recorded_by": None,
        "is_abnormal": is_abnormal,
        "abnormal_reason": abnormal_reason,
        "notes": None,
        "symptoms": None,
        "created_at": _NOW_ISO,
    }


def _weight_row(value=65.0):
    return {
        "id": "rec-weight-001",
        "user_id": _USER_ID,
        "record_type": "weight",
        "values": {"value": value},
        "measured_at": "2024-06-01T08:00:00",
        "input_method": "manual",
        "recorded_by": None,
        "is_abnormal": False,
        "abnormal_reason": None,
        "notes": None,
        "symptoms": None,
        "created_at": _NOW_ISO,
    }


# ---------------------------------------------------------------------------
# check_abnormal 单元测试
# ---------------------------------------------------------------------------

from api.v1.health import check_abnormal


class TestCheckAbnormal:
    """测试异常判定逻辑。"""

    def test_normal_blood_pressure(self):
        is_abn, reason = check_abnormal("blood_pressure", {"systolic": 120, "diastolic": 80})
        assert is_abn is False
        assert reason is None

    def test_high_systolic(self):
        is_abn, reason = check_abnormal("blood_pressure", {"systolic": 160, "diastolic": 80})
        assert is_abn is True
        assert "收缩压偏高" in reason

    def test_low_diastolic(self):
        is_abn, reason = check_abnormal("blood_pressure", {"systolic": 120, "diastolic": 50})
        assert is_abn is True
        assert "舒张压偏低" in reason

    def test_both_abnormal(self):
        is_abn, reason = check_abnormal("blood_pressure", {"systolic": 150, "diastolic": 95})
        assert is_abn is True
        assert "收缩压偏高" in reason
        assert "舒张压偏高" in reason

    def test_normal_fasting_blood_sugar(self):
        is_abn, reason = check_abnormal("blood_sugar", {"value": 5.0, "measurement_type": "fasting"})
        assert is_abn is False

    def test_high_fasting_blood_sugar(self):
        is_abn, reason = check_abnormal("blood_sugar", {"value": 7.0, "measurement_type": "fasting"})
        assert is_abn is True
        assert "空腹血糖偏高" in reason

    def test_low_postprandial_blood_sugar(self):
        is_abn, reason = check_abnormal("blood_sugar", {"value": 3.0, "measurement_type": "postprandial"})
        assert is_abn is True
        assert "餐后血糖偏低" in reason

    def test_normal_heart_rate(self):
        is_abn, reason = check_abnormal("heart_rate", {"value": 75})
        assert is_abn is False

    def test_high_heart_rate(self):
        is_abn, reason = check_abnormal("heart_rate", {"value": 110})
        assert is_abn is True
        assert "心率偏高" in reason

    def test_low_heart_rate(self):
        is_abn, reason = check_abnormal("heart_rate", {"value": 50})
        assert is_abn is True
        assert "心率偏低" in reason

    def test_normal_temperature(self):
        is_abn, reason = check_abnormal("temperature", {"value": 36.5})
        assert is_abn is False

    def test_high_temperature(self):
        is_abn, reason = check_abnormal("temperature", {"value": 38.5})
        assert is_abn is True
        assert "体温偏高" in reason

    def test_low_temperature(self):
        is_abn, reason = check_abnormal("temperature", {"value": 35.0})
        assert is_abn is True
        assert "体温偏低" in reason

    def test_weight_never_abnormal(self):
        is_abn, reason = check_abnormal("weight", {"value": 200})
        assert is_abn is False
        assert reason is None

    def test_unknown_type_never_abnormal(self):
        is_abn, reason = check_abnormal("unknown", {"value": 999})
        assert is_abn is False
        assert reason is None


# ---------------------------------------------------------------------------
# POST /api/v1/health/records
# ---------------------------------------------------------------------------


class TestCreateRecord:
    def test_unauthenticated(self):
        resp = client.post("/api/v1/health/records", json={
            "user_id": _USER_ID,
            "record_type": "blood_pressure",
            "values": {"systolic": 120, "diastolic": 80},
            "measured_at": "2024-06-01T09:00:00",
        })
        assert resp.status_code == 401

    @patch("api.v1.health.postgrest")
    def test_create_normal_blood_pressure(self, mock_pg):
        """正常血压录入，is_abnormal=False。"""
        row = _bp_row()
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([row])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/health/records",
            json={
                "user_id": _USER_ID,
                "record_type": "blood_pressure",
                "values": {"systolic": 120, "diastolic": 80},
                "measured_at": "2024-06-01T09:00:00",
                "input_method": "manual",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["record_type"] == "blood_pressure"
        assert data["is_abnormal"] is False

    @patch("api.v1.health.postgrest")
    def test_create_abnormal_blood_pressure(self, mock_pg):
        """异常血压录入，is_abnormal=True。"""
        row = _bp_row(systolic=160, diastolic=95, is_abnormal=True, abnormal_reason="收缩压偏高；舒张压偏高")
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([row])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/health/records",
            json={
                "user_id": _USER_ID,
                "record_type": "blood_pressure",
                "values": {"systolic": 160, "diastolic": 95},
                "measured_at": "2024-06-01T09:00:00",
                "input_method": "voice",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["is_abnormal"] is True
        assert data["abnormal_reason"] is not None

    @patch("api.v1.health.postgrest")
    def test_create_blood_sugar_record(self, mock_pg):
        """血糖录入。"""
        row = _bs_row()
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([row])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/health/records",
            json={
                "user_id": _USER_ID,
                "record_type": "blood_sugar",
                "values": {"value": 5.5, "measurement_type": "fasting"},
                "measured_at": "2024-06-01T07:00:00",
                "input_method": "voice",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        assert resp.json()["record_type"] == "blood_sugar"

    @patch("api.v1.health.postgrest")
    def test_create_weight_record(self, mock_pg):
        """体重录入，无异常判定。"""
        row = _weight_row()
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([row])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/health/records",
            json={
                "user_id": _USER_ID,
                "record_type": "weight",
                "values": {"value": 65.0},
                "measured_at": "2024-06-01T08:00:00",
                "input_method": "manual",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["is_abnormal"] is False

    @patch("api.v1.health.postgrest")
    def test_create_record_with_family_recorder(self, mock_pg):
        """家属代录，recorded_by 字段。"""
        row = {**_bp_row(), "recorded_by": _FAMILY_ID}
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([row])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/health/records",
            json={
                "user_id": _USER_ID,
                "record_type": "blood_pressure",
                "values": {"systolic": 120, "diastolic": 80},
                "measured_at": "2024-06-01T09:00:00",
                "input_method": "family",
                "recorded_by": _FAMILY_ID,
            },
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 201
        assert resp.json()["recorded_by"] == _FAMILY_ID

    @patch("api.v1.health.postgrest")
    def test_create_record_db_failure(self, mock_pg):
        """数据库插入失败返回500。"""
        mock_tbl = MagicMock()
        mock_tbl.insert.return_value.execute.return_value = _make_execute([])
        mock_pg.from_.return_value = mock_tbl

        resp = client.post(
            "/api/v1/health/records",
            json={
                "user_id": _USER_ID,
                "record_type": "heart_rate",
                "values": {"value": 75},
                "measured_at": "2024-06-01T08:00:00",
            },
            headers=_auth_header(),
        )
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /api/v1/health/records
# ---------------------------------------------------------------------------


class TestGetRecords:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/health/records")
        assert resp.status_code == 401

    @patch("api.v1.health.postgrest")
    def test_get_records_default(self, mock_pg):
        """默认获取当前用户记录。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = (
            _make_execute([_bp_row(), _hr_row()])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get("/api/v1/health/records", headers=_auth_header())
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @patch("api.v1.health.postgrest")
    def test_get_records_with_type_filter(self, mock_pg):
        """按 record_type 过滤。"""
        mock_tbl = MagicMock()
        # With record_type filter: .eq("user_id").eq("record_type").order().limit().offset()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = (
            _make_execute([_bp_row()])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            "/api/v1/health/records?record_type=blood_pressure",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["record_type"] == "blood_pressure"

    @patch("api.v1.health.postgrest")
    def test_get_records_with_user_id(self, mock_pg):
        """家属查询指定用户记录。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = (
            _make_execute([_bp_row()])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            f"/api/v1/health/records?user_id={_USER_ID}",
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    @patch("api.v1.health.postgrest")
    def test_get_records_empty(self, mock_pg):
        """无记录返回空列表。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get("/api/v1/health/records", headers=_auth_header())
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# GET /api/v1/health/records/latest
# ---------------------------------------------------------------------------


class TestGetLatestRecords:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/health/records/latest")
        assert resp.status_code == 401

    @patch("api.v1.health.postgrest")
    def test_get_latest_with_data(self, mock_pg):
        """有数据时返回各类型最新记录。"""
        rows_by_type = {
            "blood_pressure": [_bp_row()],
            "blood_sugar": [_bs_row()],
            "heart_rate": [_hr_row()],
            "weight": [],
            "temperature": [_temp_row()],
        }

        call_count = {"n": 0}
        type_order = ["blood_pressure", "blood_sugar", "heart_rate", "weight", "temperature"]

        def from_side_effect(table_name):
            mock_tbl = MagicMock()
            idx = call_count["n"]
            call_count["n"] += 1
            rt = type_order[idx] if idx < len(type_order) else "blood_pressure"
            data = rows_by_type.get(rt, [])
            mock_tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = (
                _make_execute(data)
            )
            return mock_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.get("/api/v1/health/records/latest", headers=_auth_header())
        assert resp.status_code == 200
        data = resp.json()
        assert "blood_pressure" in data
        assert data["blood_pressure"] is not None
        assert data["blood_pressure"]["record_type"] == "blood_pressure"
        assert data["weight"] is None  # no weight record

    @patch("api.v1.health.postgrest")
    def test_get_latest_all_empty(self, mock_pg):
        """无任何记录时所有类型返回 null。"""
        def from_side_effect(table_name):
            mock_tbl = MagicMock()
            mock_tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = (
                _make_execute([])
            )
            return mock_tbl

        mock_pg.from_.side_effect = from_side_effect

        resp = client.get("/api/v1/health/records/latest", headers=_auth_header())
        assert resp.status_code == 200
        data = resp.json()
        for rt in ["blood_pressure", "blood_sugar", "heart_rate", "weight", "temperature"]:
            assert data[rt] is None


# ---------------------------------------------------------------------------
# GET /api/v1/health/records/trend
# ---------------------------------------------------------------------------


class TestGetTrend:
    def test_unauthenticated(self):
        resp = client.get("/api/v1/health/records/trend?record_type=blood_pressure")
        assert resp.status_code == 401

    def test_missing_record_type(self):
        """缺少 record_type 参数返回422。"""
        resp = client.get("/api/v1/health/records/trend", headers=_auth_header())
        assert resp.status_code == 422

    @patch("api.v1.health.postgrest")
    def test_get_trend_success(self, mock_pg):
        """获取7天趋势数据。"""
        rows = [
            _bp_row(),
            {**_bp_row(), "id": "rec-bp-002", "measured_at": "2024-06-02T09:00:00"},
        ]
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = (
            _make_execute(rows)
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            "/api/v1/health/records/trend?record_type=blood_pressure",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @patch("api.v1.health.postgrest")
    def test_get_trend_empty(self, mock_pg):
        """无趋势数据返回空列表。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = (
            _make_execute([])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            "/api/v1/health/records/trend?record_type=heart_rate&days=30",
            headers=_auth_header(),
        )
        assert resp.status_code == 200
        assert resp.json() == []

    @patch("api.v1.health.postgrest")
    def test_get_trend_with_user_id(self, mock_pg):
        """家属查询指定用户趋势。"""
        mock_tbl = MagicMock()
        mock_tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = (
            _make_execute([_hr_row()])
        )
        mock_pg.from_.return_value = mock_tbl

        resp = client.get(
            f"/api/v1/health/records/trend?record_type=heart_rate&user_id={_USER_ID}",
            headers=_auth_header(user_id=_FAMILY_ID, role="family"),
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
