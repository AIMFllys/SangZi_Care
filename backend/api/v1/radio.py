"""健康广播模块 — 个性化推荐、分类查询、播放记录、内容生成。

需求: 11.1, 11.2, 11.3, 11.4, 11.8
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from core.middleware import require_auth
from models.broadcast import (
    BroadcastGenerateRequest,
    BroadcastResponse,
    PlayRecordCreate,
    PlayRecordResponse,
)
from services.health_broadcast import (
    BROADCAST_CATEGORIES,
    health_broadcast_service,
)
from services.supabase_client import postgrest

router = APIRouter(prefix="/radio", tags=["健康广播"])


# ---------------------------------------------------------------------------
# GET /radio/recommend — 获取个性化推荐广播
# ---------------------------------------------------------------------------


@router.get("/recommend", response_model=list[BroadcastResponse])
async def get_recommendations(
    current_user: dict = Depends(require_auth),
    limit: int = Query(default=10, ge=1, le=50),
):
    """根据用户年龄、慢性病、季节等获取个性化推荐广播。"""
    user_id = current_user["user_id"]

    # 获取用户信息
    user_result = (
        postgrest.from_("users")
        .select("id,name,birth_date,chronic_diseases,role")
        .eq("id", user_id)
        .execute()
    )
    user_rows = user_result.data or []
    user_info = user_rows[0] if user_rows else {}

    # 构建推荐过滤条件
    filters = health_broadcast_service.build_recommend_filters(user_info)

    # 查询已发布的广播
    query = (
        postgrest.from_("health_broadcasts")
        .select("*")
        .eq("is_published", True)
    )

    # 按季节过滤（包含当前季节或无季节限制的）
    if filters["season"]:
        query = query.or_(
            f"target_season.eq.{filters['season']},target_season.is.null"
        )

    query = query.order("created_at", desc=True).limit(limit)
    result = query.execute()
    rows = result.data or []

    return [BroadcastResponse(**row) for row in rows]


# ---------------------------------------------------------------------------
# GET /radio/categories — 获取广播分类
# ---------------------------------------------------------------------------


@router.get("/categories")
async def get_categories():
    """获取所有广播分类列表。"""
    return BROADCAST_CATEGORIES


# ---------------------------------------------------------------------------
# POST /radio/play-record — 记录播放历史
# ---------------------------------------------------------------------------


@router.post("/play-record", response_model=PlayRecordResponse, status_code=201)
async def create_play_record(
    body: PlayRecordCreate,
    current_user: dict = Depends(require_auth),
):
    """记录用户的广播播放历史。user_id 从认证 Token 中获取。"""
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "user_id": current_user["user_id"],
        "broadcast_id": body.broadcast_id,
        "played_at": now,
        "play_duration": body.play_duration,
        "completed": body.completed,
        "liked": body.liked,
        "created_at": now,
    }

    result = postgrest.from_("broadcast_play_history").insert(record).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="记录播放历史失败")

    # 更新广播播放次数
    try:
        postgrest.from_("health_broadcasts").update(
            {"play_count": "play_count + 1"}
        ).eq("id", body.broadcast_id).execute()
    except Exception:
        pass  # 播放计数更新失败不影响主流程

    return PlayRecordResponse(**rows[0])


# ---------------------------------------------------------------------------
# POST /radio/generate — 生成个性化广播内容
# ---------------------------------------------------------------------------


@router.post("/generate", response_model=BroadcastResponse, status_code=201)
async def generate_broadcast(
    body: BroadcastGenerateRequest,
    current_user: dict = Depends(require_auth),
):
    """使用豆包LLM生成个性化广播内容，并通过TTS合成音频。"""
    now = datetime.now(timezone.utc).isoformat()

    # 1. 使用LLM生成广播文本
    text_result = await health_broadcast_service.generate_broadcast_text(
        category=body.category,
        topic=body.topic,
        target_diseases=body.target_diseases,
    )

    # 2. 使用TTS生成音频
    audio_bytes, duration = await health_broadcast_service.generate_audio(
        text_result["content"]
    )

    # 3. 保存广播记录到数据库
    record = {
        "title": text_result["title"],
        "content": text_result["content"],
        "category": body.category,
        "audio_duration": duration,
        "is_published": True,
        "target_age_min": body.target_age_min,
        "target_age_max": body.target_age_max,
        "target_diseases": body.target_diseases,
        "ai_prompt": text_result["ai_prompt"],
        "generated_by": "doubao",
        "play_count": 0,
        "created_at": now,
        "updated_at": now,
    }

    result = postgrest.from_("health_broadcasts").insert(record).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="保存广播内容失败")

    return BroadcastResponse(**rows[0])
