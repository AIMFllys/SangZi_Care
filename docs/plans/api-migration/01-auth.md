# 01 — Auth 认证

> Status: planned · 依赖 [00-shared-server](./00-shared-server.md)

## 1. 背景与对照

对照 [`backend/api/v1/auth.py`](../../../backend/api/v1/auth.py)、[`backend/services/email_service.py`](../../../backend/services/email_service.py)。

产品形态保持：数学验证码 → 邮箱 OTP → JWT（access + refresh）。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| GET | `/api/v1/auth/captcha` | 无 | 返回 `captcha_id` + 题目 |
| POST | `/api/v1/auth/send-code` | 无 | body: email + captcha；60s 限流；发 6 位码 |
| POST | `/api/v1/auth/verify` | 无 | 校验 OTP；新用户可自动创建；返回 tokens + user |
| POST | `/api/v1/auth/refresh` | 无 | body: `refresh_token`；换新 access+refresh |

响应字段尽量与现前端登录页约定一致（对照 `app/login`）。

## 3. 文件落点

```
app/api/v1/auth/captcha/route.ts
app/api/v1/auth/send-code/route.ts
app/api/v1/auth/verify/route.ts
app/api/v1/auth/refresh/route.ts
lib/server/otp-store.ts      # 进程内 Map（见风险）
lib/server/email.ts          # SMTP 发送
```

## 4. 环境变量

`SMTP_*`、`JWT_*`、Supabase secret（写 users）。

## 5. 验收步骤

1. `GET /api/v1/auth/captcha` 得题目。
2. `POST send-code` 后邮箱收到码（或 DEBUG 日志打印）。
3. `POST verify` 得 token；`GET /api/v1/users/me`（若 02 未合入可用临时探测）或解码 JWT。
4. `POST refresh` 成功换票。
5. 错误 captcha / 过期 OTP → 4xx。

## 6. 风险与非目标

- **OTP 存储**：首版可用进程内 Map（与 Python 现状类似）。**文档标明**：EdgeOne 多实例下不可靠，后续改 Redis/表存储或 Supabase Auth。
- **非目标**：不改登录 UI；不引入手机号登录。

## 7. Devin

见 [smoke-p0](../e2e-devin/smoke-p0.md) 步骤 1：完整登录进首页。
