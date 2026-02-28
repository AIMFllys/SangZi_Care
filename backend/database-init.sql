-- 桑梓智护 - Supabase 数据库初始化脚本
-- 在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- ============================================
-- 1. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('elder', 'family')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS '用户表 - 存储老年人和家属的基本信息';
COMMENT ON COLUMN users.role IS '用户角色: elder=老年人, family=家属';

-- ============================================
-- 2. 家庭绑定关系表
-- ============================================
CREATE TABLE IF NOT EXISTS elder_family_binds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(elder_id, family_id)
);

COMMENT ON TABLE elder_family_binds IS '家庭绑定关系表 - 老年人与家属的关联';
COMMENT ON COLUMN elder_family_binds.relationship IS '关系类型: 子女、配偶、亲戚等';

-- ============================================
-- 3. 用药计划表
-- ============================================
CREATE TABLE IF NOT EXISTS medication_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medicine_name VARCHAR(200) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  time_slots TEXT[],
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE medication_plans IS '用药计划表 - 老年人的用药安排';
COMMENT ON COLUMN medication_plans.time_slots IS '服药时间段数组，如: ["08:00", "12:00", "18:00"]';
COMMENT ON COLUMN medication_plans.is_active IS '计划是否激活';

-- ============================================
-- 4. 用药记录表
-- ============================================
CREATE TABLE IF NOT EXISTS medication_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES medication_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'taken', 'missed', 'skipped')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE medication_records IS '用药记录表 - 实际服药情况';
COMMENT ON COLUMN medication_records.status IS '服药状态: pending=待服用, taken=已服用, missed=漏服, skipped=跳过';

-- ============================================
-- 5. 健康记录表
-- ============================================
CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL,
  value JSONB NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE health_records IS '健康记录表 - 血压、血糖、心率等健康数据';
COMMENT ON COLUMN health_records.record_type IS '记录类型: blood_pressure, blood_sugar, heart_rate, weight, temperature 等';
COMMENT ON COLUMN health_records.value IS 'JSON 格式的健康数据，如: {"systolic": 120, "diastolic": 80}';

-- ============================================
-- 6. 消息表
-- ============================================
CREATE TABLE IF NOT EXISTS elder_care_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'voice', 'image')),
  voice_url TEXT,
  voice_duration INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE elder_care_messages IS '消息表 - 老年人与家属之间的消息';
COMMENT ON COLUMN elder_care_messages.message_type IS '消息类型: text=文字, voice=语音, image=图片';
COMMENT ON COLUMN elder_care_messages.voice_duration IS '语音消息时长（秒）';

-- ============================================
-- 7. 紧急呼叫记录表
-- ============================================
CREATE TABLE IF NOT EXISTS emergency_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location JSONB,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'answered', 'missed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE emergency_calls IS '紧急呼叫记录表 - 老年人的紧急求助';
COMMENT ON COLUMN emergency_calls.location IS 'JSON 格式的位置信息: {"latitude": 39.9, "longitude": 116.4, "address": "..."}';
COMMENT ON COLUMN emergency_calls.status IS '呼叫状态: pending=待接听, answered=已接听, missed=未接听, cancelled=已取消';

-- ============================================
-- 8. 健康广播消息表
-- ============================================
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  audio_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

COMMENT ON TABLE broadcast_messages IS '健康广播消息表 - 健康资讯和养生知识';
COMMENT ON COLUMN broadcast_messages.category IS '分类: health_tips, nutrition, exercise, disease_prevention 等';
COMMENT ON COLUMN broadcast_messages.audio_url IS '语音播报的音频文件 URL';

-- ============================================
-- 创建索引以提升查询性能
-- ============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 家庭绑定关系索引
CREATE INDEX IF NOT EXISTS idx_elder_family_binds_elder ON elder_family_binds(elder_id);
CREATE INDEX IF NOT EXISTS idx_elder_family_binds_family ON elder_family_binds(family_id);

-- 用药计划索引
CREATE INDEX IF NOT EXISTS idx_medication_plans_user ON medication_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_plans_active ON medication_plans(is_active);

-- 用药记录索引
CREATE INDEX IF NOT EXISTS idx_medication_records_plan ON medication_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_medication_records_user ON medication_records(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_records_status ON medication_records(status);
CREATE INDEX IF NOT EXISTS idx_medication_records_scheduled ON medication_records(scheduled_time);

-- 健康记录索引
CREATE INDEX IF NOT EXISTS idx_health_records_user ON health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_health_records_type ON health_records(record_type);
CREATE INDEX IF NOT EXISTS idx_health_records_recorded ON health_records(recorded_at);

-- 消息索引
CREATE INDEX IF NOT EXISTS idx_messages_sender ON elder_care_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON elder_care_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON elder_care_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON elder_care_messages(is_read);

-- 紧急呼叫索引
CREATE INDEX IF NOT EXISTS idx_emergency_calls_caller ON emergency_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_status ON emergency_calls(status);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_created ON emergency_calls(created_at);

-- 健康广播索引
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_active ON broadcast_messages(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_published ON broadcast_messages(published_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_category ON broadcast_messages(category);

-- ============================================
-- 插入测试数据（可选）
-- ============================================

-- 测试用户 1: 老年人
INSERT INTO users (id, phone, name, role) 
VALUES ('11111111-1111-1111-1111-111111111111', '13800138000', '张大爷', 'elder')
ON CONFLICT (phone) DO NOTHING;

-- 测试用户 2: 家属
INSERT INTO users (id, phone, name, role) 
VALUES ('22222222-2222-2222-2222-222222222222', '13800138001', '张小明', 'family')
ON CONFLICT (phone) DO NOTHING;

-- 绑定关系
INSERT INTO elder_family_binds (elder_id, family_id, relationship)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '儿子'
)
ON CONFLICT (elder_id, family_id) DO NOTHING;

-- 测试用药计划
INSERT INTO medication_plans (user_id, medicine_name, dosage, frequency, time_slots, start_date)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '降压药',
  '1片',
  '每日两次',
  ARRAY['08:00', '20:00'],
  CURRENT_DATE
)
ON CONFLICT DO NOTHING;

-- 测试健康记录
INSERT INTO health_records (user_id, record_type, value, recorded_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'blood_pressure',
  '{"systolic": 120, "diastolic": 80}'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;

-- 测试健康广播
INSERT INTO broadcast_messages (title, content, category)
VALUES (
  '春季养生小贴士',
  '春季是养生的好时节，建议多吃新鲜蔬菜水果，适当运动，保持心情愉悦。',
  'health_tips'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 启用 Row Level Security (RLS) - 生产环境推荐
-- ============================================

-- 注意：启用 RLS 后需要配置相应的策略
-- 开发阶段可以先不启用，生产环境强烈建议启用

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE elder_family_binds ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medication_plans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medication_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE elder_care_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 完成
-- ============================================

SELECT 'Database initialization completed successfully!' AS status;

-- 查看创建的表
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'users',
    'elder_family_binds',
    'medication_plans',
    'medication_records',
    'health_records',
    'elder_care_messages',
    'emergency_calls',
    'broadcast_messages'
  )
ORDER BY table_name;
