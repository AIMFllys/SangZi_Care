# 03 — Family 家庭绑定

> Status: planned · 依赖 00、[02-users](./02-users.md)

## 1. 背景与对照

对照 [`backend/api/v1/family.py`](../../../backend/api/v1/family.py)。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| POST | `/api/v1/family/generate-code` | Bearer | Elder 生成 6 位码；pending 行 |
| POST | `/api/v1/family/bind` | Bearer | Family 兑码 → active |
| GET | `/api/v1/family/binds` | Bearer | 当前用户相关 active 绑定 |
| PATCH | `/api/v1/family/binds/{bind_id}` | Bearer | 权限 / 状态 |
| DELETE | `/api/v1/family/binds/{bind_id}` | Bearer | 软解绑 inactive |

## 3. 修复项（本域内完成，不扩散实现）

统一权限字段约定并写进实现注释：

- API 读写优先布尔列：`can_view_health`、`can_edit_medication`、`can_receive_emergency`
- 若表仍有 JSONB `permissions`，迁移时双写或只读一处并在本计划验收中验证 emergency/medicine 通知不会因字段不一致得到空列表（emergency 实现见 10，但约定在此定稿）

## 4. 文件落点

```
app/api/v1/family/generate-code/route.ts
app/api/v1/family/bind/route.ts
app/api/v1/family/binds/route.ts
app/api/v1/family/binds/[bind_id]/route.ts
```

## 5. 环境变量

沿用 00。

## 6. 验收步骤

1. Elder 账号 generate-code → 得码。
2. Family 账号 bind → binds 两侧可见。
3. PATCH 权限开关后 GET 反映。
4. DELETE 后不再出现在 active 列表。

## 7. 风险与非目标

- **非目标**：不改 bind 页视觉；不实现紧急 FAB。

## 8. Devin

见 smoke-p0 步骤 7：`/settings/bind` 绑定区可见；有条件时走一遍绑码。
