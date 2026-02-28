"""健康记录模块 — 健康数据录入、查询、最新记录、趋势数据。

录入时根据阈值判定异常并标记。

需求: 8.1, 8.4, 8.5
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from core.middleware import require_auth
from models.health import HealthRecordCreate, HealthRecordResponse
from services.supabase_client import postgrest

router = APIRouter(prefix="/health", tags=["健康记录"])

# ---------------------------------------------------------------------------
# 健康数据异常阈值
# ---------------------------------------------------------------------------

HEALTH_THRESHOLDS = {
    "blood_pressure": {
        "systolic": {"min": 90, "max": 140},
        "diastolic": {"min": 60, "max": 90},
    },
    "blood_sugar": {
        "fasting": {"min": 3.9, "max": 6.1},
        "postprandial": {"min": 3.9, "max": 7.8},
    },
    "heart_rate": {"min": 60, "max": 100},
    "temperature": {"min": 36.0, "max": 37.3},
}


def check_abnormal(record_type: str, values: dict) -> tuple[bool, str | None]:
    """根据阈值判定健康数据是否异常。

    Returns:
        (is_abnormal, abnormal_reason) — 正常时 reason 为 None。
    """
    reasons: list[str] = []

    if record_type == "blood_pressure":
        thresholds = HEALTH_THRESHOLDS["blood_pressure"]
        systolic = values.get("systolic")
        diastolic = values.get("diastolic")

        if systolic is not None:
            t = thresholds["systolic"]
            if systolic < t["min"]:
                reasons.append(f"收缩压偏低({systolic}<{t['min']})")
            elif systolic > t["max"]:
                reasons.append(f"收缩压偏高({systolic}>{t['max']})")

        if diastolic is not None:
            t = thresholds["diastolic"]
            if diastolic < t["min"]:
                reasons.append(f"舒张压偏低({diastolic}<{t['min']})")
            elif diastolic > t["max"]:
                reasons.append(f"舒张压偏高({diastolic}>{t['max']})")

    elif record_type == "blood_sugar":
        value = values.get("value")
        measurement_type = values.get("measurement_type", "fasting")

        if value is not None and measurement_type in HEALTH_THRESHOLDS["blood_sugar"]:
            t = HEALTH_THRESHOLDS["blood_sugar"][measurement_type]
            label = "空腹血糖" if measurement_type == "fasting" else "餐后血糖"
            if value < t["min"]:
                reasons.append(f"{label}偏低({value}<{t['min']})")
            elif value > t["max"]:
                reasons.append(f"{label}偏高({value}>{t['max']})")

    elif record_type == "heart_rate":
        value = values.get("value")
        if value is not None:
            t = HEALTH_THRESHOLDS["heart_rate"]
            if value < t["min"]:
                reasons.append(f"心率偏低({value}<{t['min']})")
            elif value > t["max"]:
                reasons.append(f"心率偏高({value}>{t['max']})")

    elif record_type == "temperature":
        value = values.get("value")
        if value is not None:
            t = HEALTH_THRESHOLDS["temperature"]
            if value < t["min"]:
                reasons.append(f"体温偏低({value}<{t['min']})")
            elif value > t["max"]:
                reasons.append(f"体温偏高({value}>{t['max']})")

    # weight has no threshold
    if reasons:
        return True, "；".join(reasons)
    return False, None


# ---------------------------------------------------------------------------
# POST /health/records — 录入健康数据
# ---------------------------------------------------------------------------


@router.post("/records", response_model=HealthRecordResponse, status_code=201)
async def create_record(
    body: HealthRecordCreate,
    current_user: dict = Depends(require_auth),
):
    """录入健康数据，自动判定异常并标记。"""
    now = datetime.now(timezone.utc).isoformat()

    is_abnormal, abnormal_reason = check_abnormal(body.record_type, body.values)

    record = body.model_dump(exclude_none=True)
    record["is_abnormal"] = is_abnormal
    if abnormal_reason:
        record["abnormal_reason"] = abnormal_reason
    record["created_at"] = now

    result = postgrest.from_("health_records").insert(record).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="录入健康数据失败")

    return HealthRecordResponse(**rows[0])


# ---------------------------------------------------------------------------
# GET /health/records — 获取健康记录列表
# ---------------------------------------------------------------------------


@router.get("/records", response_model=list[HealthRecordResponse])
async def get_records(
    current_user: dict = Depends(require_auth),
    user_id: Optional[str] = Query(default=None),
    record_type: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """获取健康记录列表，按 measured_at 降序排列。"""
    target_user_id = user_id or current_user["user_id"]

    query = (
        postgrest.from_("health_records")
        .select("*")
        .eq("user_id", target_user_id)
    )

    if record_type:
        query = query.eq("record_type", record_type)

    query = query.order("measured_at", desc=True).limit(limit).offset(offset)
    result = query.execute()
    rows = result.data or []

    return [HealthRecordResponse(**row) for row in rows]


# ---------------------------------------------------------------------------
# GET /health/records/latest — 获取最新各类健康数据
# ---------------------------------------------------------------------------

RECORD_TYPES = ["blood_pressure", "blood_sugar", "heart_rate", "weight", "temperature"]


@router.get("/records/latest")
async def get_latest_records(
    current_user: dict = Depends(require_auth),
    user_id: Optional[str] = Query(default=None),
):
    """获取每种类型的最新一条健康记录。"""
    target_user_id = user_id or current_user["user_id"]

    latest: dict[str, HealthRecordResponse | None] = {}

    for rt in RECORD_TYPES:
        result = (
            postgrest.from_("health_records")
            .select("*")
            .eq("user_id", target_user_id)
            .eq("record_type", rt)
            .order("measured_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        latest[rt] = HealthRecordResponse(**rows[0]) if rows else None

    return latest


# ---------------------------------------------------------------------------
# GET /health/records/trend — 获取趋势数据
# ---------------------------------------------------------------------------


@router.get("/records/trend", response_model=list[HealthRecordResponse])
async def get_trend(
    current_user: dict = Depends(require_auth),
    record_type: str = Query(...),
    user_id: Optional[str] = Query(default=None),
    days: int = Query(default=7, ge=1, le=90),
):
    """获取指定类型在最近 N 天内的健康记录，按 measured_at 升序（用于绘图）。"""
    target_user_id = user_id or current_user["user_id"]

    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    result = (
        postgrest.from_("health_records")
        .select("*")
        .eq("user_id", target_user_id)
        .eq("record_type", record_type)
        .gte("measured_at", since)
        .order("measured_at", desc=False)
        .execute()
    )
    rows = result.data or []

    return [HealthRecordResponse(**row) for row in rows]
