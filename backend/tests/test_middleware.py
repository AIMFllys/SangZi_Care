"""Tests for core/middleware.py — FastAPI auth dependencies.

Uses a minimal FastAPI test app to exercise require_auth and optional_auth
through real HTTP requests.
"""

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from core.middleware import optional_auth, require_auth
from core.security import create_access_token

# ---------------------------------------------------------------------------
# Test app
# ---------------------------------------------------------------------------

_app = FastAPI()


@_app.get("/protected")
async def protected_route(user: dict = Depends(require_auth)):
    return {"user": user}


@_app.get("/optional")
async def optional_route(user: dict | None = Depends(optional_auth)):
    return {"user": user}


client = TestClient(_app)


# ---------------------------------------------------------------------------
# require_auth
# ---------------------------------------------------------------------------

def test_require_auth_no_token_returns_401():
    resp = client.get("/protected")
    assert resp.status_code == 401


def test_require_auth_invalid_token_returns_401():
    resp = client.get("/protected", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401


def test_require_auth_valid_token_returns_user():
    token = create_access_token("u1", "elder")
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["user_id"] == "u1"
    assert data["user"]["role"] == "elder"


def test_require_auth_expired_token_returns_401():
    """Manually craft an already-expired token."""
    import time
    import jwt as _jwt
    from core.config import settings

    payload = {
        "sub": "u1",
        "role": "elder",
        "iat": time.time() - 7200,
        "exp": time.time() - 3600,
    }
    token = _jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# optional_auth
# ---------------------------------------------------------------------------

def test_optional_auth_no_token_returns_none():
    resp = client.get("/optional")
    assert resp.status_code == 200
    assert resp.json()["user"] is None


def test_optional_auth_valid_token_returns_user():
    token = create_access_token("u2", "family")
    resp = client.get("/optional", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["user_id"] == "u2"
    assert data["user"]["role"] == "family"


def test_optional_auth_invalid_token_returns_401():
    resp = client.get("/optional", headers={"Authorization": "Bearer bad-token"})
    assert resp.status_code == 401


def test_optional_auth_expired_token_returns_401():
    import time
    import jwt as _jwt
    from core.config import settings

    payload = {
        "sub": "u1",
        "role": "elder",
        "iat": time.time() - 7200,
        "exp": time.time() - 3600,
    }
    token = _jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    resp = client.get("/optional", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()
