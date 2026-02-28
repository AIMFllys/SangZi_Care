"""JWT token creation and verification utilities."""

from datetime import datetime, timedelta, timezone

import jwt

from core.config import settings


def create_access_token(user_id: str, role: str) -> str:
    """Create a JWT access token.

    Args:
        user_id: The user's unique identifier (stored as ``sub``).
        role: The user's role (``elder`` or ``family``).

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a longer-lived refresh token (7 days).

    Args:
        user_id: The user's unique identifier.

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=7),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token.

    Args:
        token: The encoded JWT string.

    Returns:
        The decoded payload dictionary.

    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the token is malformed or invalid.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
    )


def get_current_user(token: str) -> dict:
    """Extract user info from a valid access token.

    Args:
        token: The encoded JWT string.

    Returns:
        ``{"user_id": str, "role": str}``

    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the token is invalid or missing required claims.
    """
    payload = decode_token(token)
    user_id = payload.get("sub")
    role = payload.get("role")
    if not user_id:
        raise jwt.InvalidTokenError("Token missing 'sub' claim")
    if not role:
        raise jwt.InvalidTokenError("Token missing 'role' claim")
    return {"user_id": user_id, "role": role}
