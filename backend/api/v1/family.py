"""家属绑定模块 — 生成绑定码、绑定关系、查询/更新/解除绑定。

需求: 7.1, 7.2, 7.3, 7.4, 7.8
"""

import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.middleware import require_auth
from models.user import FamilyBindCreate, FamilyBindResponse, FamilyBindUpdate
from services.supabase_client import postgrest

router = APIRouter(prefix="/family", tags=["家属绑定"])


# ---------------------------------------------------------------------------
# Response models (endpoint-specific)
# ---------------------------------------------------------------------------


class GenerateCodeResponse(BaseModel):
    bind_code: str
    bind_id: str


class DeleteBindResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _generate_bind_code() -> str:
    """Generate a random 6-digit numeric bind code."""
    return "".join(random.choices(string.digits, k=6))


def _db_row_to_response(row: dict) -> FamilyBindResponse:
    """Map a Supabase elder_family_binds row to FamilyBindResponse."""
    return FamilyBindResponse(
        id=row["id"],
        elder_id=row.get("elder_id", ""),
        family_id=row.get("family_id") or "",
        relation=row.get("relation", ""),
        status=row.get("status"),
        bind_code=row.get("bind_code"),
        can_view_health=row.get("can_view_health", False),
        can_edit_medication=row.get("can_edit_medication", False),
        can_receive_emergency=row.get("can_receive_emergency", False),
        bound_at=row.get("bound_at"),
        created_at=row.get("created_at"),
    )


# ---------------------------------------------------------------------------
# POST /family/generate-code
# ---------------------------------------------------------------------------


@router.post("/generate-code", response_model=GenerateCodeResponse)
async def generate_code(current_user: dict = Depends(require_auth)):
    """生成6位数字绑定码（老年人端调用）。

    在 elder_family_binds 表创建一条 status='pending' 的记录，
    包含 elder_id 和 bind_code。
    """
    user_id = current_user["user_id"]
    bind_code = _generate_bind_code()
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "elder_id": user_id,
        "bind_code": bind_code,
        "status": "pending",
        "relation": "pending",
        "can_view_health": True,
        "can_edit_medication": False,
        "can_receive_emergency": True,
        "created_at": now,
        "bound_at": now,
    }

    try:
        result = postgrest.from_("elder_family_binds").insert(record).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"生成绑定码失败: {exc}")
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="生成绑定码失败")

    return GenerateCodeResponse(bind_code=bind_code, bind_id=rows[0]["id"])


# ---------------------------------------------------------------------------
# POST /family/bind
# ---------------------------------------------------------------------------


@router.post("/bind", response_model=FamilyBindResponse)
async def bind_family(
    body: FamilyBindCreate,
    current_user: dict = Depends(require_auth),
):
    """通过绑定码建立家属关系。

    1. 查找 status='pending' 的绑定码记录
    2. 设置 family_id、relationship、status='active'、默认权限
    """
    family_id = current_user["user_id"]

    # Look up the pending bind code
    lookup_result = (
        postgrest.from_("elder_family_binds")
        .select("*")
        .eq("bind_code", body.bind_code)
        .eq("status", "pending")
        .execute()
    )
    rows = lookup_result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="绑定码无效或已使用")

    bind_record = rows[0]

    # Prevent self-binding
    if bind_record["elder_id"] == family_id:
        raise HTTPException(status_code=400, detail="不能绑定自己")

    now = datetime.now(timezone.utc).isoformat()

    update_data = {
        "family_id": family_id,
        "relation": body.relation,
        "status": "active",
        "can_view_health": True,
        "can_edit_medication": False,
        "can_receive_emergency": True,
        "bound_at": now,
    }

    update_result = (
        postgrest.from_("elder_family_binds")
        .update(update_data)
        .eq("id", bind_record["id"])
        .execute()
    )
    updated_rows = update_result.data or []
    if not updated_rows:
        raise HTTPException(status_code=500, detail="绑定失败")

    return _db_row_to_response(updated_rows[0])


# ---------------------------------------------------------------------------
# GET /family/binds
# ---------------------------------------------------------------------------


@router.get("/binds", response_model=list[FamilyBindResponse])
async def get_binds(current_user: dict = Depends(require_auth)):
    """获取当前用户的所有活跃绑定关系。

    同时查询 elder_id 和 family_id 匹配的记录。
    """
    user_id = current_user["user_id"]

    # Query as elder
    elder_result = (
        postgrest.from_("elder_family_binds")
        .select("*")
        .eq("elder_id", user_id)
        .eq("status", "active")
        .execute()
    )

    # Query as family
    family_result = (
        postgrest.from_("elder_family_binds")
        .select("*")
        .eq("family_id", user_id)
        .eq("status", "active")
        .execute()
    )

    elder_rows = elder_result.data or []
    family_rows = family_result.data or []

    # Deduplicate by id
    seen_ids = set()
    all_rows = []
    for row in elder_rows + family_rows:
        if row["id"] not in seen_ids:
            seen_ids.add(row["id"])
            all_rows.append(row)

    return [_db_row_to_response(row) for row in all_rows]


# ---------------------------------------------------------------------------
# PATCH /family/binds/{id}
# ---------------------------------------------------------------------------


@router.patch("/binds/{bind_id}", response_model=FamilyBindResponse)
async def update_bind(
    bind_id: str,
    body: FamilyBindUpdate,
    current_user: dict = Depends(require_auth),
):
    """更新绑定权限。"""
    now = datetime.now(timezone.utc).isoformat()

    update_data: dict = {
        "bound_at": now,
    }

    if body.can_view_health is not None:
        update_data["can_view_health"] = body.can_view_health
    if body.can_edit_medication is not None:
        update_data["can_edit_medication"] = body.can_edit_medication
    if body.can_receive_emergency is not None:
        update_data["can_receive_emergency"] = body.can_receive_emergency
    if body.status is not None:
        update_data["status"] = body.status

    update_result = (
        postgrest.from_("elder_family_binds")
        .update(update_data)
        .eq("id", bind_id)
        .execute()
    )
    updated_rows = update_result.data or []
    if not updated_rows:
        raise HTTPException(status_code=500, detail="更新绑定权限失败")

    return _db_row_to_response(updated_rows[0])


# ---------------------------------------------------------------------------
# DELETE /family/binds/{id}
# ---------------------------------------------------------------------------


@router.delete("/binds/{bind_id}", response_model=DeleteBindResponse)
async def delete_bind(
    bind_id: str,
    current_user: dict = Depends(require_auth),
):
    """解除绑定（软删除，设置 status='inactive'）。"""
    now = datetime.now(timezone.utc).isoformat()

    update_result = (
        postgrest.from_("elder_family_binds")
        .update({"status": "inactive", "bound_at": now})
        .eq("id", bind_id)
        .execute()
    )
    updated_rows = update_result.data or []
    if not updated_rows:
        raise HTTPException(status_code=404, detail="绑定记录不存在")

    return DeleteBindResponse(message="绑定已解除")
