# `oc_` 表前缀（运行时约定）

> Updated: 2026-07-13
> 共享 Supabase：`rithloxzperfgiqyquch`（多项目共存）

智护银龄 / 小护关爱业务表统一使用前缀 **`oc_`**。云端已于 2026-03 完成重命名；应用代码于 2026-07 对齐。

| 逻辑名（历史） | 物理表名（现行） |
|----------------|------------------|
| `users` | `oc_users` |
| `auth_challenges`（新增） | `oc_auth_challenges`（migration 待应用） |
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
- 认证挑战 RPC：[`lib/server/otp-store.ts`](../../lib/server/otp-store.ts)
- Schema migration：[`supabase/migrations/20260713230000_auth_challenges.sql`](../../supabase/migrations/20260713230000_auth_challenges.sql)
- Realtime（未挂载）：[`lib/realtimeSubscriptions.ts`](../../lib/realtimeSubscriptions.ts)

## 注意

- 共享库中无前缀的 `public.users` 等属于 **MedShow**，不是本项目用户表；切勿再 `.from('users')`。
- `oc_auth_challenges` 启用并强制 RLS；`public`、`anon`、`authenticated`、`service_role` 均无表级直接访问权。认证服务只能以 `service_role` 调用 `oc_auth_challenge_*` SECURITY DEFINER RPC。
- 认证挑战表仅保存随机 CAPTCHA ID、HMAC 隐私索引/摘要和状态元数据，不保存原始邮箱、答案或 OTP。HMAC pepper 由服务端 `JWT_SECRET` 进行域分离派生，不新增生产密钥。
- 本次新增 migration 只存在于仓库；合并部署前仍须由运维应用到目标 Supabase。未应用时认证挑战路由会安全返回 503。
