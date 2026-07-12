# 05 — Medicine 用药

> Status: planned · 依赖 00、[03-family](./03-family.md)

## 1. 背景与对照

对照 [`backend/api/v1/medicine.py`](../../../backend/api/v1/medicine.py)。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| GET | `/api/v1/medicine/plans` | Bearer | 可选 `user_id` |
| POST | `/api/v1/medicine/plans` | Bearer | 创建计划 |
| PATCH | `/api/v1/medicine/plans/{plan_id}` | Bearer | 更新 |
| GET | `/api/v1/medicine/today` | Bearer | 今日时间线 |
| POST | `/api/v1/medicine/records` | Bearer | taken/skipped/delayed |
| POST | `/api/v1/medicine/notify-family` | Bearer | 可保持 stub（写日志/空成功） |

跨用户读计划：需绑定；写计划建议校验 `can_edit_medication`（与 03 约定一致）。

## 3. 文件落点

```
app/api/v1/medicine/plans/route.ts
app/api/v1/medicine/plans/[plan_id]/route.ts
app/api/v1/medicine/today/route.ts
app/api/v1/medicine/records/route.ts
app/api/v1/medicine/notify-family/route.ts
```

## 4. 验收步骤

1. GET today 结构与前端 `medicineStore` 兼容。
2. POST records 确认服药后 today 状态变化。
3. plans CRUD 基本路径。

## 5. 风险与非目标

- **非目标**：不挂 `PlanForm` 路由（属 UI 板块）；不实现真推送。

## 6. Devin

smoke-p0 步骤 5：`/medicine` 有数据时确认一次。
