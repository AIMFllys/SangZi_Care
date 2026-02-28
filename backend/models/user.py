"""用户与家属绑定 Pydantic 模型，对齐 Supabase users / elder_family_binds 表。"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------- users 表 ----------

class UserBase(BaseModel):
    name: str
    phone: str
    role: str = Field(..., pattern=r"^(elder|family)$")


class UserCreate(UserBase):
    """创建用户（注册时）"""
    pass


class UserUpdate(BaseModel):
    """更新用户个人信息（所有字段可选）"""
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    chronic_diseases: Optional[list[str]] = None
    font_size: Optional[str] = None
    voice_speed: Optional[float] = None
    wake_word: Optional[str] = None


class UserRoleUpdate(BaseModel):
    """仅更新角色"""
    role: str = Field(..., pattern=r"^(elder|family)$")


class UserResponse(BaseModel):
    id: str
    name: str
    phone: str
    role: str
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    chronic_diseases: Optional[list[str]] = None
    font_size: Optional[str] = None
    voice_speed: Optional[float] = None
    wake_word: Optional[str] = None
    last_active_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- elder_family_binds 表 ----------

class FamilyBindBase(BaseModel):
    elder_id: str
    family_id: str
    relation: str


class FamilyBindCreate(BaseModel):
    """通过绑定码建立关系"""
    bind_code: str
    relation: str


class FamilyBindUpdate(BaseModel):
    """更新绑定权限"""
    can_view_health: Optional[bool] = None
    can_edit_medication: Optional[bool] = None
    can_receive_emergency: Optional[bool] = None
    status: Optional[str] = None


class FamilyBindResponse(BaseModel):
    id: str
    elder_id: str
    family_id: str
    relation: str
    status: Optional[str] = None
    bind_code: Optional[str] = None
    can_view_health: Optional[bool] = None
    can_edit_medication: Optional[bool] = None
    can_receive_emergency: Optional[bool] = None
    bound_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
