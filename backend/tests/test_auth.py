"""Task 4.1 — 验证后端认证API

Tests:
- POST /api/v1/auth/send-code: 发送验证码、频率限制
- POST /api/v1/auth/verify: 登录成功、验证码错误、过期、新用户自动创建
- POST /api/v1/auth/refresh: Token刷新、无效token

Requirements: 1.1, 1.2, 1.5
"""

import time
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.v1 import auth as auth_module
from core.security import create_refresh_token, decode_token
from main import app

client = TestClient(app)


def _clear_codes():
    """Reset the in-memory verification code store between tests."""
    auth_module._verification_codes.clear()


# ---------------------------------------------------------------------------
# Helper: mock Supabase postgrest
# ---------------------------------------------------------------------------

def _mock_postgrest_existing_user():
    """Return a mock that simulates an existing user in the DB."""
    mock = MagicMock()
    user_row = {
        "id": "user-123",
        "name": "张三",
        "phone": "13800138000",
        "role": "elder",
        "avatar_url": None,
        "birth_date": None,
        "gender": None,
        "chronic_diseases": None,
        "font_size": None,
        "voice_speed": None,
        "wake_word": None,
        "last_active_at": None,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": None,
    }
    execute_result = MagicMock()
    execute_result.data = [user_row]
    mock.from_.return_value.select.return_value.eq.return_value.execute.return_value = execute_result
    return mock


def _mock_postgrest_new_user():
    """Return a mock that simulates no existing user, then creates one."""
    mock = MagicMock()

    # select returns empty
    select_result = MagicMock()
    select_result.data = []
    mock.from_.return_value.select.return_value.eq.return_value.execute.return_value = select_result

    # insert returns the new user
    new_user_row = {
        "id": "new-user-456",
        "name": "用户8000",
        "phone": "13800138000",
        "role": "elder",
        "avatar_url": None,
        "birth_date": None,
        "gender": None,
        "chronic_diseases": None,
        "font_size": None,
        "voice_speed": None,
        "wake_word": None,
        "last_active_at": None,
        "created_at": "2024-06-01T00:00:00",
        "updated_at": None,
    }
    insert_result = MagicMock()
    insert_result.data = [new_user_row]
    mock.from_.return_value.insert.return_value.execute.return_value = insert_result

    return mock


# ---------------------------------------------------------------------------
# POST /api/v1/auth/send-code
# ---------------------------------------------------------------------------

class TestSendCode:
    def setup_method(self):
        _clear_codes()

    def test_send_code_success(self):
        resp = client.post("/api/v1/auth/send-code", json={"phone": "13800138000"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["expires_in"] == 300

    def test_send_code_stores_code(self):
        client.post("/api/v1/auth/send-code", json={"phone": "13900139000"})
        assert "13900139000" in auth_module._verification_codes
        code, expiry, _ = auth_module._verification_codes["13900139000"]
        assert len(code) == 6
        assert code.isdigit()

    def test_send_code_rate_limit(self):
        client.post("/api/v1/auth/send-code", json={"phone": "13700137000"})
        resp = client.post("/api/v1/auth/send-code", json={"phone": "13700137000"})
        assert resp.status_code == 429

    def test_send_code_rate_limit_expires(self):
        """After RATE_LIMIT_SECONDS, a new code can be sent."""
        phone = "13600136000"
        client.post("/api/v1/auth/send-code", json={"phone": phone})
        # Manually backdate the last_send timestamp
        code, expiry, _ = auth_module._verification_codes[phone]
        auth_module._verification_codes[phone] = (code, expiry, time.time() - 61)
        resp = client.post("/api/v1/auth/send-code", json={"phone": phone})
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/v1/auth/verify
# ---------------------------------------------------------------------------

class TestVerify:
    def setup_method(self):
        _clear_codes()

    @patch("api.v1.auth.postgrest")
    def test_verify_existing_user(self, mock_pg):
        """Correct code + existing user → login success."""
        mock_pg.from_ = _mock_postgrest_existing_user().from_

        # Seed a code
        auth_module._verification_codes["13800138000"] = (
            "123456",
            time.time() + 300,
            time.time() - 60,
        )

        resp = client.post(
            "/api/v1/auth/verify",
            json={"phone": "13800138000", "code": "123456"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["is_new_user"] is False
        assert data["user"]["id"] == "user-123"
        assert data["user"]["phone"] == "13800138000"

    @patch("api.v1.auth.postgrest")
    def test_verify_new_user_auto_create(self, mock_pg):
        """Correct code + no existing user → auto-create + is_new_user=True."""
        mock_pg.from_ = _mock_postgrest_new_user().from_

        auth_module._verification_codes["13800138000"] = (
            "654321",
            time.time() + 300,
            time.time() - 60,
        )

        resp = client.post(
            "/api/v1/auth/verify",
            json={"phone": "13800138000", "code": "654321"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_new_user"] is True
        assert data["user"]["name"] == "用户8000"

    def test_verify_wrong_code(self):
        auth_module._verification_codes["13800138000"] = (
            "111111",
            time.time() + 300,
            time.time() - 60,
        )
        resp = client.post(
            "/api/v1/auth/verify",
            json={"phone": "13800138000", "code": "999999"},
        )
        assert resp.status_code == 400
        assert "验证码错误" in resp.json()["detail"]

    def test_verify_expired_code(self):
        auth_module._verification_codes["13800138000"] = (
            "111111",
            time.time() - 1,  # already expired
            time.time() - 300,
        )
        resp = client.post(
            "/api/v1/auth/verify",
            json={"phone": "13800138000", "code": "111111"},
        )
        assert resp.status_code == 400
        assert "验证码已过期" in resp.json()["detail"]

    def test_verify_no_code_sent(self):
        resp = client.post(
            "/api/v1/auth/verify",
            json={"phone": "13800138000", "code": "123456"},
        )
        assert resp.status_code == 400
        assert "验证码错误" in resp.json()["detail"]

    @patch("api.v1.auth.postgrest")
    def test_verify_code_consumed_after_use(self, mock_pg):
        """After successful verify, the code should be removed."""
        mock_pg.from_ = _mock_postgrest_existing_user().from_

        auth_module._verification_codes["13800138000"] = (
            "123456",
            time.time() + 300,
            time.time() - 60,
        )
        client.post(
            "/api/v1/auth/verify",
            json={"phone": "13800138000", "code": "123456"},
        )
        assert "13800138000" not in auth_module._verification_codes

    @patch("api.v1.auth.postgrest")
    def test_verify_returns_valid_jwt(self, mock_pg):
        """The returned access_token should be a valid JWT with correct claims."""
        mock_pg.from_ = _mock_postgrest_existing_user().from_

        auth_module._verification_codes["13800138000"] = (
            "123456",
            time.time() + 300,
            time.time() - 60,
        )
        resp = client.post(
            "/api/v1/auth/verify",
            json={"phone": "13800138000", "code": "123456"},
        )
        data = resp.json()
        payload = decode_token(data["access_token"])
        assert payload["sub"] == "user-123"
        assert payload["role"] == "elder"


# ---------------------------------------------------------------------------
# POST /api/v1/auth/refresh
# ---------------------------------------------------------------------------

class TestRefresh:
    @patch("api.v1.auth.postgrest")
    def test_refresh_success(self, mock_pg):
        mock_pg.from_ = _mock_postgrest_existing_user().from_

        refresh_token = create_refresh_token("user-123")
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

        # New access token should have correct claims
        payload = decode_token(data["access_token"])
        assert payload["sub"] == "user-123"
        assert payload["role"] == "elder"

    def test_refresh_invalid_token(self):
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "not-a-valid-token"},
        )
        assert resp.status_code == 401

    def test_refresh_access_token_rejected(self):
        """An access token (not refresh type) should be rejected."""
        from core.security import create_access_token

        access_token = create_access_token("user-123", "elder")
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token},
        )
        assert resp.status_code == 401
        assert "无效" in resp.json()["detail"]

    @patch("api.v1.auth.postgrest")
    def test_refresh_user_not_found(self, mock_pg):
        """If the user no longer exists, return 404."""
        empty_result = MagicMock()
        empty_result.data = []
        mock_pg.from_.return_value.select.return_value.eq.return_value.execute.return_value = empty_result

        refresh_token = create_refresh_token("deleted-user")
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert resp.status_code == 404
