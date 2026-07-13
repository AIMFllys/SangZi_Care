# `oc_` 表前缀（运行时约定）

> Updated: 2026-07-13
> 共享 Supabase：`rithloxzperfgiqyquch`（多项目共存）

智护银龄 / 小护关爱业务表统一使用前缀 **`oc_`**。云端已于 2026-03 完成重命名；应用代码于 2026-07 对齐。

| 逻辑名（历史） | 物理表名（现行） |
|----------------|------------------|
| `users` | `oc_users` |
| `elder_family_binds` | `oc_elder_family_binds` |
| `medication_plans` | `oc_medication_plans` |
| `medication_records` | `oc_medication_records` |
| `health_records` | `oc_health_records` |
| `ai_conversations` | `oc_ai_conversations` |
| `emergency_calls` | `oc_emergency_calls` |
| `elder_care_messages` | `oc_elder_care_messages` |
| `health_broadcasts` | `oc_health_broadcasts` |
| `broadcast_play_history` | `oc_broadcast_play_history` |

## 代码落点

- 类型：[`types/supabase.ts`](../../types/supabase.ts)
- 写库：[`app/api/v1/**`](../../app/api/v1/)
- Realtime（未挂载）：[`lib/realtimeSubscriptions.ts`](../../lib/realtimeSubscriptions.ts)

## 注意

- 共享库中无前缀的 `public.users` 等属于 **MedShow**，不是本项目用户表；切勿再 `.from('users')`。
- 本仓库暂无 `supabase/migrations/`；schema 真相以控制台 `oc_*` 为准。
