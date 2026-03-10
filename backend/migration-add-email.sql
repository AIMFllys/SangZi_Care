-- 桑梓智护 — 登录方式迁移：手机号 → 邮箱
-- 在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 添加 email 列
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- 2. 创建 email 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. 将 phone 列改为可选 (允许 NULL)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

SELECT '邮箱字段迁移完成！' AS status;
