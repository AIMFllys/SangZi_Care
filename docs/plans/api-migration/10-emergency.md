# 10 — Emergency 紧急呼叫

> Status: planned · 依赖 00、[03-family](./03-family.md)

## 1. 背景与对照

对照 [`backend/api/v1/emergency.py`](../../../backend/api/v1/emergency.py)。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| POST | `/api/v1/emergency/trigger` | Bearer | 创建呼叫；解析通知对象 |
| POST | `/api/v1/emergency/cancel` | Bearer | 取消 |
| POST | `/api/v1/emergency/notify` | Bearer | 记录通知元数据 |
| GET | `/api/v1/emergency/history` | Bearer | 历史 |

## 3. 修复项

通知对象解析必须遵守 [03-family](./03-family.md) 权限约定（`can_receive_emergency` 布尔列），避免 Python 现状中 JSONB/`relationship` 字段不一致导致零家属。

无真实电话/推送通道：与现网一致，以写库为主。

## 4. 文件落点

```
app/api/v1/emergency/trigger/route.ts
app/api/v1/emergency/cancel/route.ts
app/api/v1/emergency/notify/route.ts
app/api/v1/emergency/history/route.ts
```

## 5. 验收步骤

1. trigger → history 有记录。
2. cancel 状态更新。
3. 有紧急权限的绑定家属出现在 notified 结构中（字段对照前端若有）。

## 6. 风险与非目标

- **非目标**：不实现 EmergencyFAB / 首页 SOS 产品闭环（属 [ui-redesign](../ui-redesign/)）。

## 7. Devin

P2：非首轮阻塞。有 UI 入口后再加。
