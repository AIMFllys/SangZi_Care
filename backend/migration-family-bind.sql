-- 桑梓智护 — 家庭绑定表迁移：支持绑定码流程
-- 在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- 
-- 问题: generate-code 需要创建 pending 记录时 family_id 尚未确定，
-- 但原 schema 要求 family_id NOT NULL。
--
-- 解决:
--   1. 将 family_id 改为可选 (允许 NULL)
--   2. 删除 (elder_id, family_id) 唯一约束 (pending 记录可能有多条)

-- 1. 允许 family_id 为 NULL
ALTER TABLE elder_family_binds ALTER COLUMN family_id DROP NOT NULL;

-- 2. 删除旧唯一约束 (如果存在)
ALTER TABLE elder_family_binds DROP CONSTRAINT IF EXISTS elder_family_binds_elder_id_family_id_key;

-- 3. 确保 bind_code, status, permissions, updated_at 列存在 (幂等)
ALTER TABLE elder_family_binds ADD COLUMN IF NOT EXISTS bind_code VARCHAR(10);
ALTER TABLE elder_family_binds ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE elder_family_binds ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE elder_family_binds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. 为 bind_code 创建索引以加速查找
CREATE INDEX IF NOT EXISTS idx_elder_family_binds_bind_code ON elder_family_binds(bind_code);
CREATE INDEX IF NOT EXISTS idx_elder_family_binds_status ON elder_family_binds(status);

SELECT '家庭绑定表迁移完成！' AS status;
