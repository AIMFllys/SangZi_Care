"""用户管理模块 — 获取/更新当前用户信息、更新角色。

需求: 19.3
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from core.middleware import require_auth
from models.user import UserResponse, UserUpdate, UserRoleUpdate
from services.supabase_client import postgrest

router = APIRouter(prefix="/users", tags=["用户"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(require_auth)):
    """获取当前登录用户的完整信息。"""
    user_id = current_user["user_id"]

    result = postgrest.from_("users").select("*").eq("id", user_id).execute()
    rows = result.data or []

    if not rows:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserResponse(**rows[0])


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    current_user: dict = Depends(require_auth),
):
    """更新当前用户的个人信息（姓名、头像、出生日期、性别、慢性病等）。"""
    user_id = current_user["user_id"]

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="没有需要更新的字段")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        postgrest.from_("users")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )
    rows = result.data or []

    if not rows:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserResponse(**rows[0])


@router.patch("/me/role", response_model=UserResponse)
async def update_role(
    body: UserRoleUpdate,
    current_user: dict = Depends(require_auth),
):
    """更新当前用户的角色（elder / family）。"""
    user_id = current_user["user_id"]

    update_data = {
        "role": body.role,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        postgrest.from_("users")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )
    rows = result.data or []

    if not rows:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserResponse(**rows[0])
