"""认证模块 — 短信验证码登录/注册、Token刷新。

MVP阶段验证码存储在内存中，生产环境应替换为Redis + 真实短信服务。
"""

import logging
import random
import time
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.security import create_access_token, create_refresh_token, decode_token
from models.user import UserResponse
from services.supabase_client import postgrest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["认证"])

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class SendCodeRequest(BaseModel):
    phone: str


class SendCodeResponse(BaseModel):
    success: bool
    expires_in: int


class VerifyRequest(BaseModel):
    phone: str
    code: str


class VerifyResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse
    is_new_user: bool


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str


# ---------------------------------------------------------------------------
# In-memory verification code store
# phone -> (code, expiry_timestamp, last_send_timestamp)
# ---------------------------------------------------------------------------

_verification_codes: dict[str, tuple[str, float, float]] = {}

CODE_EXPIRE_SECONDS = 300  # 5 minutes
RATE_LIMIT_SECONDS = 60    # 1 code per phone per 60s


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/send-code", response_model=SendCodeResponse)
async def send_code(req: SendCodeRequest):
    """发送短信验证码（MVP: 存内存 + 日志输出）。"""
    phone = req.phone

    # Rate limit check
    if phone in _verification_codes:
        _, _, last_send = _verification_codes[phone]
        elapsed = time.time() - last_send
        if elapsed < RATE_LIMIT_SECONDS:
            raise HTTPException(
                status_code=429,
                detail=f"请{int(RATE_LIMIT_SECONDS - elapsed)}秒后再试",
            )

    code = str(random.randint(100000, 999999))
    now = time.time()
    _verification_codes[phone] = (code, now + CODE_EXPIRE_SECONDS, now)

    # In production this would call an SMS gateway; for MVP just log it.
    logger.info("验证码 [%s] -> %s (expires in %ds)", phone, code, CODE_EXPIRE_SECONDS)

    return SendCodeResponse(success=True, expires_in=CODE_EXPIRE_SECONDS)


@router.post("/verify", response_model=VerifyResponse)
async def verify(req: VerifyRequest):
    """验证码登录/注册。新用户自动创建账户。"""
    phone = req.phone
    code = req.code

    # Look up stored code
    stored = _verification_codes.get(phone)
    if stored is None:
        raise HTTPException(status_code=400, detail="验证码错误")

    stored_code, expiry, _ = stored

    # Check expiry first
    if time.time() > expiry:
        _verification_codes.pop(phone, None)
        raise HTTPException(status_code=400, detail="验证码已过期")

    # Check code match
    if code != stored_code:
        raise HTTPException(status_code=400, detail="验证码错误")

    # Code is valid — remove it so it can't be reused
    _verification_codes.pop(phone, None)

    # Look up user by phone
    result = postgrest.from_("users").select("*").eq("phone", phone).execute()
    rows = result.data or []

    is_new_user = False

    if rows:
        user_row = rows[0]
    else:
        # Auto-create new user
        is_new_user = True
        default_name = f"用户{phone[-4:]}"
        new_user = {
            "name": default_name,
            "phone": phone,
            "role": "elder",
        }
        insert_result = postgrest.from_("users").insert(new_user).execute()
        user_row = insert_result.data[0]

    user = UserResponse(**user_row)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    return VerifyResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user,
        is_new_user=is_new_user,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(req: RefreshRequest):
    """刷新Token — 用refresh token换取新的access + refresh token。"""
    try:
        payload = decode_token(req.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的refresh token")

    # Must be a refresh-type token
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="无效的refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的refresh token")

    # Look up user to get current role
    result = postgrest.from_("users").select("*").eq("id", user_id).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="用户不存在")

    user_row = rows[0]
    role = user_row.get("role", "elder")

    access_token = create_access_token(user_id, role)
    new_refresh_token = create_refresh_token(user_id)

    return RefreshResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )
