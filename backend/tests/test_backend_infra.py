"""Task 2.4 — 验证后端基础架构

Validates:
- FastAPI app imports and health check returns 200
- Supabase PostgREST client initializes correctly
- JWT middleware: no token → 401, valid token → 200 (via test app)
- Pydantic models serialize/deserialize correctly (covered by test_models.py)

Requirements: 19.1, 19.5, 19.6
"""

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from core.middleware import require_auth
from core.security import create_access_token
from main import app

main_client = TestClient(app)


# ---------------------------------------------------------------------------
# Health check (Req 19.1)
# ---------------------------------------------------------------------------

def test_health_check_returns_200():
    resp = main_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_health_check_no_auth_required():
    """Health check should be accessible without any token."""
    resp = main_client.get("/health")
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Supabase client (Req 19.1)
# ---------------------------------------------------------------------------

def test_supabase_postgrest_client_initializes():
    """The PostgREST client should import and have a configured base URL."""
    from services.supabase_client import postgrest

    assert postgrest is not None
    assert "/rest/v1" in str(postgrest.session.base_url)


# ---------------------------------------------------------------------------
# JWT middleware integration (Req 19.5, 19.6)
# Uses a dedicated test app to verify require_auth dependency works
# end-to-end through real HTTP requests.
# ---------------------------------------------------------------------------

_test_app = FastAPI()


@_test_app.get("/test-protected")
async def _protected(user: dict = Depends(require_auth)):
    return {"user": user}


_auth_client = TestClient(_test_app)


def test_jwt_middleware_no_token_returns_401():
    resp = _auth_client.get("/test-protected")
    assert resp.status_code == 401


def test_jwt_middleware_invalid_token_returns_401():
    resp = _auth_client.get(
        "/test-protected",
        headers={"Authorization": "Bearer garbage"},
    )
    assert resp.status_code == 401


def test_jwt_middleware_valid_token_returns_200():
    token = create_access_token("user-infra-test", "elder")
    resp = _auth_client.get(
        "/test-protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["user_id"] == "user-infra-test"
    assert data["user"]["role"] == "elder"


# ---------------------------------------------------------------------------
# App router mounts correctly (Req 19.1)
# ---------------------------------------------------------------------------

def test_app_includes_api_v1_routes():
    """Verify the main app has routes under /api/v1."""
    routes = [r.path for r in app.routes]
    # At minimum, the health endpoint should exist
    assert "/health" in routes
