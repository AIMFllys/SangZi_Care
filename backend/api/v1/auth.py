"""认证模块 — 邮箱验证码登录/注册、Token刷新。

验证码存储在内存中（MVP），生产环境应替换为 Redis。
邮件通过阿里云邮件推送服务 (SMTP) 发送。
"""

import logging
import random
import time
import uuid
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from core.security import create_access_token, create_refresh_token, decode_token
from models.user import UserResponse
from services.email_service import send_verification_email
from services.supabase_client import postgrest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["认证"])

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class CaptchaResponse(BaseModel):
    captcha_id: str
    question: str


class SendCodeRequest(BaseModel):
    email: EmailStr
    captcha_id: str
    captcha_answer: int


class SendCodeResponse(BaseModel):
    success: bool
    expires_in: int


class VerifyRequest(BaseModel):
    email: EmailStr
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
# email -> (code, expiry_timestamp, last_send_timestamp)
# ---------------------------------------------------------------------------

_verification_codes: dict[str, tuple[str, float, float]] = {}

CODE_EXPIRE_SECONDS = 300  # 5 minutes
RATE_LIMIT_SECONDS = 60    # 1 code per email per 60s

# ---------------------------------------------------------------------------
# In-memory CAPTCHA store
# captcha_id -> (answer, expiry_timestamp)
# ---------------------------------------------------------------------------

_captcha_store: dict[str, tuple[int, float]] = {}
CAPTCHA_EXPIRE_SECONDS = 120  # 2 minutes


def _cleanup_expired_captchas():
    """Remove expired CAPTCHA entries."""
    now = time.time()
    expired = [k for k, (_, exp) in _captcha_store.items() if now > exp]
    for k in expired:
        _captcha_store.pop(k, None)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/captcha", response_model=CaptchaResponse)
async def get_captcha():
    """生成一个简单的数学人机验证题。"""
    _cleanup_expired_captchas()

    a = random.randint(1, 20)
    b = random.randint(1, 20)
    op = random.choice(["+", "-"])

    if op == "+":
        answer = a + b
        question = f"{a} + {b} = ?"
    else:
        # Ensure result is non-negative
        if a < b:
            a, b = b, a
        answer = a - b
        question = f"{a} - {b} = ?"

    captcha_id = str(uuid.uuid4())
    _captcha_store[captcha_id] = (answer, time.time() + CAPTCHA_EXPIRE_SECONDS)

    return CaptchaResponse(captcha_id=captcha_id, question=question)


@router.post("/send-code", response_model=SendCodeResponse)
async def send_code(req: SendCodeRequest):
    """发送邮箱验证码（需先通过人机验证）。"""
    email = req.email.lower().strip()

    # Validate CAPTCHA
    captcha = _captcha_store.pop(req.captcha_id, None)
    if captcha is None:
        raise HTTPException(status_code=400, detail="验证码已过期，请重新获取")
    answer, expiry = captcha
    if time.time() > expiry:
        raise HTTPException(status_code=400, detail="人机验证已过期，请重新获取")
    if req.captcha_answer != answer:
        raise HTTPException(status_code=400, detail="人机验证答案错误")

    # Rate limit check
    if email in _verification_codes:
        _, _, last_send = _verification_codes[email]
        elapsed = time.time() - last_send
        if elapsed < RATE_LIMIT_SECONDS:
            raise HTTPException(
                status_code=429,
                detail=f"请{int(RATE_LIMIT_SECONDS - elapsed)}秒后再试",
            )

    code = str(random.randint(100000, 999999))
    now = time.time()
    _verification_codes[email] = (code, now + CODE_EXPIRE_SECONDS, now)

    # 发送验证码邮件
    success = send_verification_email(email, code, CODE_EXPIRE_SECONDS // 60)
    if not success:
        _verification_codes.pop(email, None)
        raise HTTPException(status_code=500, detail="验证码邮件发送失败，请稍后重试")

    logger.info("验证码已发送至 %s (expires in %ds)", email, CODE_EXPIRE_SECONDS)

    return SendCodeResponse(success=True, expires_in=CODE_EXPIRE_SECONDS)


@router.post("/verify", response_model=VerifyResponse)
async def verify(req: VerifyRequest):
    """验证码登录/注册。新用户自动创建账户。"""
    email = req.email.lower().strip()
    code = req.code

    # Look up stored code
    stored = _verification_codes.get(email)
    if stored is None:
        raise HTTPException(status_code=400, detail="验证码错误")

    stored_code, expiry, _ = stored

    # Check expiry first
    if time.time() > expiry:
        _verification_codes.pop(email, None)
        raise HTTPException(status_code=400, detail="验证码已过期")

    # Check code match
    if code != stored_code:
        raise HTTPException(status_code=400, detail="验证码错误")

    # Code is valid — remove it so it can't be reused
    _verification_codes.pop(email, None)

    # Look up user by email
    result = postgrest.from_("users").select("*").eq("email", email).execute()
    rows = result.data or []

    is_new_user = False

    if rows:
        user_row = rows[0]
    else:
        # Auto-create new user
        is_new_user = True
        # 从邮箱前缀生成默认昵称
        default_name = email.split("@")[0]
        new_user = {
            "name": default_name,
            "email": email,
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
