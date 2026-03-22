# 🗄️ 数据库表前缀迁移说明 — `oc_` 前缀规范

> **迁移日期**：2026-03-22  
> **执行者**：Antigravity AI  
> **影响范围**：Supabase 项目 `rithloxzperfgiqyquch`（AIMFllys_share 共享数据库）  
> **Migration 名称**：`rename_tables_add_oc_and_in_prefixes`

---

## 📌 背景

`AIMFllys_share` 是一个 **多项目共享** 的 Supabase 数据库实例。为了避免不同项目的表名冲突并提高可维护性，已统一为所有项目表添加前缀标识：

| 前缀 | 项目 | 说明 |
|------|------|------|
| `hr_` | HUSTERead 华科读书会 | 读书会展示平台（已有前缀，无需改动） |
| **`oc_`** | **桑梓智护 Olders Care** | **🔴 本项目 — 智慧养老关怀平台** |
| `in_` | AIMFllys Introduce | 个人介绍网站 |
| `_` | 系统元数据 | 项目注册表、命名规范（`_project_registry`, `_db_conventions`） |

---

## 🔄 表名映射（旧 → 新）

本项目的 **10 张表** 全部添加了 `oc_` 前缀：

| # | 旧表名 | 新表名 | 数据行 | 说明 |
|---|--------|--------|--------|------|
| 1 | `users` | **`oc_users`** | 2 | 用户表（elder/family/staff） |
| 2 | `elder_family_binds` | **`oc_elder_family_binds`** | 1 | 家属绑定关系 |
| 3 | `medication_plans` | **`oc_medication_plans`** | 0 | 用药计划 |
| 4 | `medication_records` | **`oc_medication_records`** | 0 | 用药记录 |
| 5 | `health_records` | **`oc_health_records`** | 0 | 健康记录 |
| 6 | `ai_conversations` | **`oc_ai_conversations`** | 0 | AI 对话记录 |
| 7 | `emergency_calls` | **`oc_emergency_calls`** | 0 | 紧急呼叫 |
| 8 | `elder_care_messages` | **`oc_elder_care_messages`** | 0 | 捂话消息 |
| 9 | `health_broadcasts` | **`oc_health_broadcasts`** | 0 | 健康广播 |
| 10 | `broadcast_play_history` | **`oc_broadcast_play_history`** | 0 | 播放记录 |

> ⚠️ **重要**：数据库端已 100% 完成迁移，外键关系、RLS 策略、索引均自动跟随重命名。但**代码端仍使用旧表名**，需要按下方指引更新。

---

## 🚨 代码端需要同步修改的文件

### 1. 后端 Python — `backend/api/v1/*.py`

以下文件中所有 `postgrest.from_("旧表名")` 需要更新为 `postgrest.from_("oc_旧表名")`：

| 文件 | 涉及的旧表名 | 需改为 |
|------|-------------|-------|
| `auth.py` | `users` | `oc_users` |
| `users.py` | `users` | `oc_users` |
| `family.py` | `elder_family_binds` | `oc_elder_family_binds` |
| `medicine.py` | `medication_plans`, `medication_records`, `elder_family_binds` | 加 `oc_` 前缀 |
| `health.py` | `health_records` | `oc_health_records` |
| `messages.py` | `elder_care_messages` | `oc_elder_care_messages` |
| `emergency.py` | `emergency_calls`, `elder_family_binds` | 加 `oc_` 前缀 |
| `radio.py` | `users`, `health_broadcasts`, `broadcast_play_history` | 加 `oc_` 前缀 |
| `ai_chat.py` | `ai_conversations` | `oc_ai_conversations` |

**批量替换指令参考**（在 `backend/` 目录下执行）：

```bash
# PowerShell 批量替换（建议先 git commit 当前代码）
$files = Get-ChildItem -Path "api/v1" -Filter "*.py" -Recurse
$replacements = @{
    'from_("users")'                  = 'from_("oc_users")'
    'from_("elder_family_binds")'     = 'from_("oc_elder_family_binds")'
    'from_("medication_plans")'       = 'from_("oc_medication_plans")'
    'from_("medication_records")'     = 'from_("oc_medication_records")'
    'from_("health_records")'         = 'from_("oc_health_records")'
    'from_("ai_conversations")'       = 'from_("oc_ai_conversations")'
    'from_("emergency_calls")'        = 'from_("oc_emergency_calls")'
    'from_("elder_care_messages")'    = 'from_("oc_elder_care_messages")'
    'from_("health_broadcasts")'      = 'from_("oc_health_broadcasts")'
    'from_("broadcast_play_history")' = 'from_("oc_broadcast_play_history")'
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    foreach ($old in $replacements.Keys) {
        $content = $content -replace [regex]::Escape($old), $replacements[$old]
    }
    Set-Content -Path $file.FullName -Value $content
}
```

### 2. 后端测试 — `backend/tests/test_*.py`

测试文件中的 mock `from_side_effect(table_name)` 也引用了旧表名：

| 文件 | 需修改的表名引用 |
|------|---------------|
| `test_emergency.py` | `elder_family_binds`, `emergency_calls` |
| `test_family.py` | `elder_family_binds` |
| `test_health.py` | `health_records` |
| `test_medicine.py` | `medication_plans`, `medication_records` |
| `test_messages.py` | `elder_care_messages` |
| `test_radio.py` | `health_broadcasts`, `broadcast_play_history` |

### 3. 前端 TypeScript 类型 — `types/supabase.ts`

此文件是 Supabase CLI 自动生成的类型定义，**表名作为 `Tables` 对象的 key**：

```diff
 public: {
   Tables: {
-    ai_conversations: { ... }
+    oc_ai_conversations: { ... }
-    broadcast_play_history: { ... }
+    oc_broadcast_play_history: { ... }
-    elder_care_messages: { ... }
+    oc_elder_care_messages: { ... }
-    elder_family_binds: { ... }
+    oc_elder_family_binds: { ... }
-    emergency_calls: { ... }
+    oc_emergency_calls: { ... }
-    health_broadcasts: { ... }
+    oc_health_broadcasts: { ... }
-    health_records: { ... }
+    oc_health_records: { ... }
-    medication_plans: { ... }
+    oc_medication_plans: { ... }
-    medication_records: { ... }
+    oc_medication_records: { ... }
-    users: { ... }
+    oc_users: { ... }
```

> 💡 **推荐做法**：直接使用 Supabase MCP 重新生成 TypeScript 类型即可自动反映新表名。

### 4. 前端 Realtime 订阅 — `lib/realtimeSubscriptions.ts`

如果文件中包含 `.channel()` 或 `.on()` 中引用了表名（如 `elder_care_messages`），也需要加上 `oc_` 前缀。

### 5. 数据库文档 — `docs/02-technical/DATABASE_SCHEMA.md`

该文档中所有表名引用（包括 ER 图、SQL 示例、索引创建语句）需统一更新为 `oc_` 前缀版本。

---

## 📘 数据库命名规范

数据库中已创建 `_db_conventions` 规范表，以下为核心规则：

### MUST（必须遵守）

| 类别 | 规则 | 示例 |
|------|------|------|
| 命名 | 所有表名必须以项目前缀开头 (`xx_`) | `oc_users`, `hr_articles` |
| 命名 | 新项目入驻前必须先在 `_project_registry` 注册前缀 | — |
| 命名 | 表名 / 列名使用 `snake_case`，全小写 | `created_at`, `user_id` |
| 命名 | 自定义枚举类型以项目前缀开头 | `hr_role`, `oc_record_type` |
| 命名 | `_` 开头的表为系统元数据表 | `_project_registry` |
| RLS | 所有表必须启用 RLS | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` |
| 类型 | 时间字段统一使用 `timestamptz` | `created_at timestamptz DEFAULT now()` |
| 类型 | 所有表必须包含 `created_at` 字段 | — |
| 文档 | 每张表必须添加 `COMMENT` 注释 | `COMMENT ON TABLE oc_users IS '...'` |

### SHOULD（建议遵守）

| 类别 | 规则 | 示例 |
|------|------|------|
| 命名 | 外键约束名: `{表名}_{列名}_fkey` | `oc_health_records_user_id_fkey` |
| 命名 | 索引名: `idx_{表名}_{列名}` | `idx_oc_users_email` |
| RLS | 策略名: `{操作}_{表名}_policy` | `select_oc_users_policy` |
| 类型 | 主键使用 `uuid + gen_random_uuid()` | — |
| 类型 | 布尔字段以 `is_` / `has_` / `can_` 开头 | `is_active`, `can_view_health` |

### 快速查询

```sql
-- 查看所有命名规范
SELECT category, rule, example, priority FROM _db_conventions ORDER BY category;

-- 查看所有项目注册表
SELECT * FROM _project_registry;

-- 查看所有项目的表一览
SELECT * FROM _project_tables_overview;
```

---

## 🔗 相关资源

- **Supabase Dashboard**: [rithloxzperfgiqyquch](https://supabase.com/dashboard/project/rithloxzperfgiqyquch)
- **项目注册表**: `_project_registry` — 查看所有共享此数据库的项目
- **命名规范表**: `_db_conventions` — 查看所有开发规范
- **表总览视图**: `_project_tables_overview` — 一览所有表归属

---

## 📋 迁移 Checklist

- [x] ~~数据库表重命名 (10张表 → `oc_` 前缀)~~
- [x] ~~更新 `_project_registry` 注册表~~
- [x] ~~创建 `_db_conventions` 命名规范表~~
- [x] ~~创建 `_project_tables_overview` 总览视图~~
- [x] ~~编写本迁移说明文档~~
- [ ] 更新后端 API 代码中的表名引用 (`backend/api/v1/*.py`)
- [ ] 更新后端测试代码中的表名引用 (`backend/tests/test_*.py`)
- [ ] 重新生成 `types/supabase.ts` TypeScript 类型定义
- [ ] 更新 `docs/02-technical/DATABASE_SCHEMA.md` 文档
- [ ] 检查 `lib/realtimeSubscriptions.ts` 中的表名引用
- [ ] 全量测试通过

---

*本文档记录了从无前缀表名到 `oc_` 前缀的完整迁移过程，确保项目在共享数据库中的表命名规范统一。*
