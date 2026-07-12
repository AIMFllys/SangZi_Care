# 09 — Radio 健康广播

> Status: planned · 依赖 00、[07-ai](./07-ai.md)（generate 文案）

## 1. 背景与对照

对照 [`backend/api/v1/radio.py`](../../../backend/api/v1/radio.py)、[`backend/services/health_broadcast.py`](../../../backend/services/health_broadcast.py)。

## 2. 目标路由表

| Method | Path | Auth | 要点 |
|--------|------|------|------|
| GET | `/api/v1/radio/recommend` | Bearer | 个性化推荐 |
| GET | `/api/v1/radio/categories` | 可无 | 静态分类列表 |
| POST | `/api/v1/radio/play-record` | Bearer | 播放历史 + play_count |
| POST | `/api/v1/radio/generate` | Bearer | LLM 生成；音频可占位 |

## 3. 文件落点

```
app/api/v1/radio/recommend/route.ts
app/api/v1/radio/categories/route.ts
app/api/v1/radio/play-record/route.ts
app/api/v1/radio/generate/route.ts
lib/server/broadcast.ts
```

## 4. 验收步骤

1. GET recommend / categories 200。
2. POST play-record 写入历史。
3. generate 在有/无豆包 Key 下行为明确。

## 5. 风险与非目标

- **非目标**：不修播放器 UI、不接 Tab 入口（属 UI 板块）。

## 6. Devin

P1：打开 `/radio`，列表有内容即可。
