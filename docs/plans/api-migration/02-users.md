# 02 — Users 用户资料

> Status: planned · 依赖 00、[01-auth](./01-auth.md)

## 1. 背景与对照

对照 [`backend/api/v1/users.py`](../../../backend/api/v1/users.py)、[`backend/models/user.py`](../../../backend/models/user.py)。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| GET | `/api/v1/users/me` | Bearer | 当前用户资料 |
| PATCH | `/api/v1/users/me` | Bearer | name、avatar、birth_date、gender、chronic_diseases、font_size、voice_speed、wake_word 等 |
| PATCH | `/api/v1/users/me/role` | Bearer | `elder` \| `family` |

## 3. 文件落点

```
app/api/v1/users/me/route.ts          # GET + PATCH
app/api/v1/users/me/role/route.ts     # PATCH
```

## 4. 环境变量

沿用 00（Supabase secret + JWT）。

## 5. 验收步骤

1. 登录后 `GET /users/me` 与库中一致。
2. `PATCH /users/me` 改姓名后再次 GET 可见。
3. `PATCH /users/me/role` 后 token/前端 `user_role` 行为与现 onboarding 兼容（前端仍可能再调 initialize）。

## 6. 风险与非目标

- **非目标**：不改 settings/profile 视觉。
- 列名以运行时 Supabase 表为准，勿盲信过时 `database-init.sql`。

## 7. Devin

登录后打开 `/settings/profile`，改一项并保存（若 UI 已接 API）。
