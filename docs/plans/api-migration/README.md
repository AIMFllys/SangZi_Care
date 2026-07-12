# API 迁移：Python FastAPI → Next.js Route Handlers

> Created: 2026-07-10  
> Status: planned  
> 对照根目录：[`backend/`](../../backend/)（只读）→ 目标 [`app/api/v1/`](../../app/api/)

## 总则

1. **路径兼容**：Next 保持 `/api/v1/<domain>/...`，与现有 [`lib/api.ts`](../../lib/api.ts) 及 Python 前缀一致。
2. **切流**：过渡期 `NEXT_PUBLIC_API_BASE_URL` 可仍指向 `http://localhost:8000`；域迁完后该域改打同源。最终在 [11-frontend-cutover.md](./11-frontend-cutover.md) 清空对 8000 的依赖。
3. **对照只读**：以 `backend/api/v1/*.py` 为行为对照；**禁止**在 Python 侧加新功能。
4. **密钥**：服务端 `SUPABASE_SECRET_KEY`；客户端 publishable。见 [`.env.example`](../../.env.example)。
5. **低耦合**：除 [00-shared-server.md](./00-shared-server.md) 外，各域计划互不改对方业务文件；跨域只经 HTTP 与 `lib/server/*`。
6. **域完成定义**：该域全部现网端点有 Route Handler + 验收清单通过 + [tech-debt](../../issues/tech-debt.md) 勾选 + 建议跑 Devin 对应冒烟（见 [e2e-devin](../e2e-devin/)）。

## 任务包索引

| 序号 | 文档 | 依赖 |
|------|------|------|
| 00 | [shared-server](./00-shared-server.md) | — |
| 01 | [auth](./01-auth.md) | 00 |
| 02 | [users](./02-users.md) | 00, 01 |
| 03 | [family](./03-family.md) | 00, 02 |
| 04 | [health](./04-health.md) | 00, 03 |
| 05 | [medicine](./05-medicine.md) | 00, 03 |
| 06 | [messages](./06-messages.md) | 00, 03 |
| 07 | [ai](./07-ai.md) | 00 |
| 08 | [voice](./08-voice.md) | 00, 07 |
| 09 | [radio](./09-radio.md) | 00, 07 |
| 10 | [emergency](./10-emergency.md) | 00, 03 |
| 11 | [frontend-cutover](./11-frontend-cutover.md) | 01–10 |
| 12 | [cleanup](./12-cleanup.md) | 11 |

## 依赖图

```text
00 → 01 → 02 → 03 → 04
                   → 05
                   → 06
                   → 10
00 → 07 → 08
       → 09
04/05/06/08/09/10 → 11 → 12
```

`04/05/06` 在 `03` 后可并行；`07→08/09` 可与健康域并行。

## 统一域文档模板

每份 `0x-*.md` 含：背景与对照路径、目标路由表、文件落点、环境变量、验收步骤、风险与非目标、Devin 建议路径。
