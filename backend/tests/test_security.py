"""Tests for core/security.py — JWT token creation and verification."""

import time
from unittest.mock import patch

import jwt
import pytest

from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)


# ---------------------------------------------------------------------------
# create_access_token
# ---------------------------------------------------------------------------

def test_create_access_token_contains_expected_claims():
    token = create_access_token("user-123", "elder")
    payload = jwt.decode(token, options={"verify_signature": False})
    assert payload["sub"] == "user-123"
    assert payload["role"] == "elder"
    assert "exp" in payload
    assert "iat" in payload


def test_create_access_token_is_decodable():
    token = create_access_token("u1", "family")
    payload = decode_token(token)
    assert payload["sub"] == "u1"
    assert payload["role"] == "family"


# ---------------------------------------------------------------------------
# create_refresh_token
# ---------------------------------------------------------------------------

def test_create_refresh_token_contains_expected_claims():
    token = create_refresh_token("user-456")
    payload = jwt.decode(token, options={"verify_signature": False})
    assert payload["sub"] == "user-456"
    assert payload["type"] == "refresh"
    assert "exp" in payload
    assert "iat" in payload


def test_refresh_token_has_longer_expiry_than_access_token():
    access = create_access_token("u1", "elder")
    refresh = create_refresh_token("u1")
    a_exp = jwt.decode(access, options={"verify_signature": False})["exp"]
    r_exp = jwt.decode(refresh, options={"verify_signature": False})["exp"]
    assert r_exp > a_exp


# ---------------------------------------------------------------------------
# decode_token
# ---------------------------------------------------------------------------

def test_decode_token_valid():
    token = create_access_token("u1", "elder")
    payload = decode_token(token)
    assert payload["sub"] == "u1"


def test_decode_token_expired_raises():
    with patch("core.security.settings") as mock_settings:
        mock_settings.JWT_SECRET = "test-secret"
        mock_settings.JWT_ALGORITHM = "HS256"
        mock_settings.JWT_EXPIRE_MINUTES = -1  # already expired
        token = create_access_token("u1", "elder")

    # Decode with the same secret should raise ExpiredSignatureError
    with patch("core.security.settings") as mock_settings:
        mock_settings.JWT_SECRET = "test-secret"
        mock_settings.JWT_ALGORITHM = "HS256"
        with pytest.raises(jwt.ExpiredSignatureError):
            decode_token(token)


def test_decode_token_invalid_signature_raises():
    token = create_access_token("u1", "elder")
    # Tamper with the token
    tampered = token[:-4] + "XXXX"
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(tampered)


def test_decode_token_garbage_raises():
    with pytest.raises(jwt.InvalidTokenError):
        decode_token("not-a-jwt")


# ---------------------------------------------------------------------------
# get_current_user
# ---------------------------------------------------------------------------

def test_get_current_user_returns_user_info():
    token = create_access_token("user-789", "family")
    user = get_current_user(token)
    assert user == {"user_id": "user-789", "role": "family"}


def test_get_current_user_missing_sub_raises():
    """A token without 'sub' should be rejected."""
    import jwt as _jwt
    from core.config import settings

    payload = {"role": "elder", "exp": time.time() + 3600, "iat": time.time()}
    token = _jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    with pytest.raises(_jwt.InvalidTokenError, match="sub"):
        get_current_user(token)


def test_get_current_user_missing_role_raises():
    """A token without 'role' should be rejected."""
    import jwt as _jwt
    from core.config import settings

    payload = {"sub": "u1", "exp": time.time() + 3600, "iat": time.time()}
    token = _jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    with pytest.raises(_jwt.InvalidTokenError, match="role"):
        get_current_user(token)
