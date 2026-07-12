# 04 — Health 健康记录

> Status: planned · 依赖 00、[03-family](./03-family.md)（跨用户鉴权）

## 1. 背景与对照

对照 [`backend/api/v1/health.py`](../../../backend/api/v1/health.py) 异常阈值逻辑。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| POST | `/api/v1/health/records` | Bearer | 创建；写 `is_abnormal` |
| GET | `/api/v1/health/records` | Bearer | 分页；可选 `user_id`、`record_type` |
| GET | `/api/v1/health/records/latest` | Bearer | 各类型最新 |
| GET | `/api/v1/health/records/trend` | Bearer | 1–90 天趋势 |

## 3. 鉴权增强（相对 Python 现状）

当查询/写入目标 `user_id` ≠ 当前用户时：必须存在 active 绑定且 `can_view_health`（写入另定：仅本人或 `can_edit` 类权限——默认**仅本人可写**，家属只读）。

## 4. 文件落点

```
app/api/v1/health/records/route.ts
app/api/v1/health/records/latest/route.ts
app/api/v1/health/records/trend/route.ts
lib/server/health-thresholds.ts
```

## 5. 验收步骤

1. 本人 POST 一条血压 → latest 可见。
2. trend 返回合理序列。
3. 无绑定家属带 `user_id` 查询 → 403。
4. 有 `can_view_health` 的家属可读老人 latest。

## 6. 风险与非目标

- **非目标**：不改健康页视觉；不接 Realtime。

## 7. Devin

smoke-p0 步骤 4：打开 `/health`，必要时 `/health/input` 写入一条。
