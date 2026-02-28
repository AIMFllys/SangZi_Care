"""用药计划与服药记录 Pydantic 模型，对齐 Supabase medication_plans / medication_records 表。"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------- medication_plans 表 ----------

class MedicationPlanBase(BaseModel):
    medicine_name: str
    dosage: str
    schedule_times: list[str]
    start_date: str


class MedicationPlanCreate(MedicationPlanBase):
    """创建用药计划"""
    user_id: str
    repeat_days: Optional[list[int]] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = True
    created_by: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    side_effects: Optional[str] = None
    remind_enabled: Optional[bool] = True
    remind_before_minutes: Optional[int] = None


class MedicationPlanUpdate(BaseModel):
    """更新用药计划（所有字段可选）"""
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    schedule_times: Optional[list[str]] = None
    repeat_days: Optional[list[int]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    side_effects: Optional[str] = None
    remind_enabled: Optional[bool] = None
    remind_before_minutes: Optional[int] = None


class MedicationPlanResponse(BaseModel):
    id: str
    user_id: str
    medicine_name: str
    dosage: str
    schedule_times: list[str]
    repeat_days: Optional[list[int]] = None
    start_date: str
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    created_by: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    side_effects: Optional[str] = None
    remind_enabled: Optional[bool] = None
    remind_before_minutes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- medication_records 表 ----------

class MedicationRecordBase(BaseModel):
    user_id: str
    plan_id: str
    scheduled_time: str


class MedicationRecordCreate(MedicationRecordBase):
    """记录服药"""
    status: Optional[str] = "pending"
    taken_at: Optional[datetime] = None
    delayed_count: Optional[int] = None
    notes: Optional[str] = None


class MedicationRecordResponse(BaseModel):
    id: str
    user_id: str
    plan_id: str
    scheduled_time: str
    status: Optional[str] = None
    taken_at: Optional[datetime] = None
    delayed_count: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
