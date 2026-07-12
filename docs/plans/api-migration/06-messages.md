# 06 — Messages 捂话

> Status: planned · 依赖 00、[03-family](./03-family.md)

## 1. 背景与对照

对照 [`backend/api/v1/messages.py`](../../../backend/api/v1/messages.py)。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| GET | `/api/v1/messages/unread-count` | Bearer | 未读数 |
| GET | `/api/v1/messages/{user_id}` | Bearer | 与对方会话分页 |
| POST | `/api/v1/messages/send` | Bearer | 文本；sender 以 JWT 为准 |
| POST | `/api/v1/messages/send-voice` | Bearer | audio_url + 元数据 |
| PATCH | `/api/v1/messages/{message_id}/read` | Bearer | 仅接收方可标已读 |

注意：Next App Router 中静态段 `unread-count`、`send`、`send-voice` 须放在动态 `[user_id]` **之前**或使用明确子路径，避免被动态路由吞掉。

## 3. 文件落点

```
app/api/v1/messages/unread-count/route.ts
app/api/v1/messages/send/route.ts
app/api/v1/messages/send-voice/route.ts
app/api/v1/messages/[user_id]/route.ts
app/api/v1/messages/[message_id]/read/route.ts
```

（若 `message_id` 与 `user_id` 冲突，采用 Python 同构路径并在实现时用 UUID 形态区分，或将 read 固定为 `/messages/read/[message_id]`——**优先保持与现前端 path 一致**，对照 `messageStore`。）

## 4. 验收步骤

1. 两绑定用户互发文本，双方会话可见。
2. unread-count 变化；read 后下降。
3. send-voice 写入元数据（音频可为占位 URL）。

## 5. 风险与非目标

- **非目标**：不改气泡 UI；不上对象存储上传流（仍接客户端给的 URL）。

## 6. Devin

smoke-p0 步骤 6：消息列表 → 发一条文本。
