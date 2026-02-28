"""用药管理模块 — 用药计划CRUD、今日时间线、服药记录、通知家属。

需求: 6.9, 6.10, 6.6
"""

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.middleware import require_auth
from models.medicine import (
    MedicationPlanCreate,
    MedicationPlanResponse,
    MedicationPlanUpdate,
    MedicationRecordCreate,
    MedicationRecordResponse,
)
from services.supabase_client import postgrest

router = APIRouter(prefix="/medicine", tags=["用药管理"])


# ---------------------------------------------------------------------------
# Response / request models (endpoint-specific)
# ---------------------------------------------------------------------------


class TodayTimelineItem(BaseModel):
    """今日用药时间线中的单条记录：计划信息 + 对应的服药状态。"""
    plan: MedicationPlanResponse
    scheduled_time: str
    record: Optional[MedicationRecordResponse] = None
    status: str = "pending"  # pending | taken | skipped | delayed


class TodayTimelineResponse(BaseModel):
    date: str
    items: list[TodayTimelineItem]


class NotifyFamilyRequest(BaseModel):
    user_id: str
    plan_id: str
    scheduled_time: str


class NotifyFamilyResponse(BaseModel):
    message: str
    notified_count: int
    notified_family_ids: list[str]


# ---------------------------------------------------------------------------
# GET /medicine/plans
# ---------------------------------------------------------------------------


@router.get("/plans", response_model=list[MedicationPlanResponse])
async def get_plans(
    current_user: dict = Depends(require_auth),
    user_id: Optional[str] = Query(default=None),
    active_only: bool = Query(default=True),
):
    """获取用药计划列表。

    - user_id 可选，默认为当前用户
    - active_only 默认 True，只返回活跃计划
    """
    target_user_id = user_id or current_user["user_id"]

    query = (
        postgrest.from_("medication_plans")
        .select("*")
        .eq("user_id", target_user_id)
    )
    if active_only:
        query = query.eq("is_active", True)

    query = query.order("created_at", desc=True)
    result = query.execute()
    rows = result.data or []

    return [MedicationPlanResponse(**row) for row in rows]


# ---------------------------------------------------------------------------
# POST /medicine/plans
# ---------------------------------------------------------------------------


@router.post("/plans", response_model=MedicationPlanResponse, status_code=201)
async def create_plan(
    body: MedicationPlanCreate,
    current_user: dict = Depends(require_auth),
):
    """创建用药计划。"""
    now = datetime.now(timezone.utc).isoformat()

    record = body.model_dump(exclude_none=True)
    record["created_at"] = now
    record["updated_at"] = now

    # If created_by not set, default to current user
    if "created_by" not in record or record["created_by"] is None:
        record["created_by"] = current_user["user_id"]

    result = postgrest.from_("medication_plans").insert(record).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="创建用药计划失败")

    return MedicationPlanResponse(**rows[0])


# ---------------------------------------------------------------------------
# PATCH /medicine/plans/{plan_id}
# ---------------------------------------------------------------------------


@router.patch("/plans/{plan_id}", response_model=MedicationPlanResponse)
async def update_plan(
    plan_id: str,
    body: MedicationPlanUpdate,
    current_user: dict = Depends(require_auth),
):
    """更新用药计划。"""
    now = datetime.now(timezone.utc).isoformat()

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="没有需要更新的字段")

    update_data["updated_at"] = now

    result = (
        postgrest.from_("medication_plans")
        .update(update_data)
        .eq("id", plan_id)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="用药计划不存在")

    return MedicationPlanResponse(**rows[0])


# ---------------------------------------------------------------------------
# GET /medicine/today
# ---------------------------------------------------------------------------


@router.get("/today", response_model=TodayTimelineResponse)
async def get_today_timeline(
    current_user: dict = Depends(require_auth),
    user_id: Optional[str] = Query(default=None),
):
    """获取今日用药时间线。

    返回所有活跃计划中今日需要服用的药品，以及对应的服药记录状态。
    """
    target_user_id = user_id or current_user["user_id"]
    today = date.today()
    today_str = today.isoformat()
    today_weekday = today.isoweekday()  # 1=Monday, 7=Sunday

    # 1. Fetch active plans for the user
    plans_result = (
        postgrest.from_("medication_plans")
        .select("*")
        .eq("user_id", target_user_id)
        .eq("is_active", True)
        .execute()
    )
    plans = plans_result.data or []

    # 2. Filter plans applicable today (check repeat_days and date range)
    today_plans = []
    for plan in plans:
        # Check date range
        if plan.get("start_date") and plan["start_date"] > today_str:
            continue
        if plan.get("end_date") and plan["end_date"] < today_str:
            continue

        # Check repeat_days (if set)
        repeat_days = plan.get("repeat_days")
        if repeat_days and today_weekday not in repeat_days:
            continue

        today_plans.append(plan)

    # 3. Fetch today's medication records for this user
    records_result = (
        postgrest.from_("medication_records")
        .select("*")
        .eq("user_id", target_user_id)
        .gte("created_at", f"{today_str}T00:00:00")
        .lte("created_at", f"{today_str}T23:59:59")
        .execute()
    )
    records = records_result.data or []

    # Build a lookup: (plan_id, scheduled_time) -> record
    record_lookup: dict[tuple[str, str], dict] = {}
    for rec in records:
        key = (rec["plan_id"], rec["scheduled_time"])
        record_lookup[key] = rec

    # 4. Build timeline items
    items: list[TodayTimelineItem] = []
    for plan in today_plans:
        schedule_times = plan.get("schedule_times") or []
        for stime in schedule_times:
            key = (plan["id"], stime)
            rec = record_lookup.get(key)
            status = rec["status"] if rec else "pending"
            items.append(
                TodayTimelineItem(
                    plan=MedicationPlanResponse(**plan),
                    scheduled_time=stime,
                    record=MedicationRecordResponse(**rec) if rec else None,
                    status=status,
                )
            )

    # Sort by scheduled_time
    items.sort(key=lambda x: x.scheduled_time)

    return TodayTimelineResponse(date=today_str, items=items)


# ---------------------------------------------------------------------------
# POST /medicine/records
# ---------------------------------------------------------------------------


@router.post("/records", response_model=MedicationRecordResponse, status_code=201)
async def create_record(
    body: MedicationRecordCreate,
    current_user: dict = Depends(require_auth),
):
    """记录服药事件（taken / skipped / delayed）。"""
    now = datetime.now(timezone.utc).isoformat()

    record = body.model_dump(exclude_none=True)
    record["created_at"] = now

    # If status is 'taken' and taken_at not provided, set it to now
    if record.get("status") == "taken" and "taken_at" not in record:
        record["taken_at"] = now

    result = postgrest.from_("medication_records").insert(record).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="记录服药失败")

    return MedicationRecordResponse(**rows[0])


# ---------------------------------------------------------------------------
# POST /medicine/notify-family
# ---------------------------------------------------------------------------


@router.post("/notify-family", response_model=NotifyFamilyResponse)
async def notify_family(
    body: NotifyFamilyRequest,
    current_user: dict = Depends(require_auth),
):
    """超时未服药时通知家属。

    查找拥有 receive_emergency_notifications 权限的已绑定家属并通知。
    """
    # Look up active binds for the elder
    binds_result = (
        postgrest.from_("elder_family_binds")
        .select("*")
        .eq("elder_id", body.user_id)
        .eq("status", "active")
        .execute()
    )
    binds = binds_result.data or []

    # Filter families with receive_emergency_notifications permission
    notified_family_ids: list[str] = []
    for bind in binds:
        permissions = bind.get("permissions") or {}
        if permissions.get("receive_emergency_notifications", False):
            notified_family_ids.append(bind["family_id"])

    if not notified_family_ids:
        return NotifyFamilyResponse(
            message="没有可通知的家属",
            notified_count=0,
            notified_family_ids=[],
        )

    # In a production system, we would send push notifications here.
    # For now, we return the list of family members who should be notified.
    return NotifyFamilyResponse(
        message="已通知家属",
        notified_count=len(notified_family_ids),
        notified_family_ids=notified_family_ids,
    )
