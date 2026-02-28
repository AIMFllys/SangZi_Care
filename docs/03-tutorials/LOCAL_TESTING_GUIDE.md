# 本地测试指南

本文档详细说明如何在本地环境测试桑梓智护项目（前端 + 后端）。

## 📋 前置要求

### 必需软件
- **Node.js**: 18.0 或更高版本
- **Python**: 3.9 或更高版本
- **Git**: 用于克隆项目

### 可选软件
- **Android Studio**: 如需构建 APK
- **VS Code**: 推荐的代码编辑器

## 🚀 快速开始（5 分钟）

### 第一步：安装依赖

**1. 安装前端依赖**
```bash
npm install
```

**2. 安装后端依赖**
```bash
cd backend
python -m venv venv

# Windows 激活虚拟环境
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 返回项目根目录
cd ..
```

### 第二步：配置环境变量

项目根目录已有 `.env` 文件，包含了火山引擎的测试密钥。

**重要提示**：
- `.env` 文件中的火山引擎密钥已配置好，可直接使用
- Supabase 配置为空，需要你自己创建 Supabase 项目并填写（见下文）

### 第三步：启动服务

**1. 启动后端服务（终端 1）**
```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

启动成功后会看到：
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**2. 启动前端服务（终端 2）**
```bash
npm run dev
```

启动成功后会看到：
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
- Ready in 2.3s
```

### 第四步：访问应用

打开浏览器访问：
- **前端应用**: http://localhost:3000
- **后端 API 文档**: http://localhost:8000/docs
- **后端健康检查**: http://localhost:8000/health

## 🔧 详细配置说明

### Supabase 配置（必需）

项目使用 Supabase 作为数据库和认证服务，需要创建自己的 Supabase 项目。

**1. 创建 Supabase 项目**
- 访问 https://supabase.com
- 注册/登录账号
- 点击 "New Project" 创建新项目
- 记录以下信息：
  - Project URL (例如: https://xxxxx.supabase.co)
  - Service Role Key (在 Settings > API 中找到)

**2. 配置数据库表**

在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL：

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('elder', 'family')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 家庭绑定关系表
CREATE TABLE elder_family_binds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(elder_id, family_id)
);

-- 用药计划表
CREATE TABLE medication_plans (
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

-- 用药记录表
CREATE TABLE medication_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES medication_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'taken', 'missed', 'skipped')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 健康记录表
CREATE TABLE health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL,
  value JSONB NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 消息表
CREATE TABLE elder_care_messages (
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

-- 紧急呼叫记录表
CREATE TABLE emergency_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location JSONB,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'answered', 'missed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- 健康广播消息表
CREATE TABLE broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  audio_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 创建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_elder_family_binds_elder ON elder_family_binds(elder_id);
CREATE INDEX idx_elder_family_binds_family ON elder_family_binds(family_id);
CREATE INDEX idx_medication_plans_user ON medication_plans(user_id);
CREATE INDEX idx_medication_records_plan ON medication_records(plan_id);
CREATE INDEX idx_medication_records_user ON medication_records(user_id);
CREATE INDEX idx_health_records_user ON health_records(user_id);
CREATE INDEX idx_messages_sender ON elder_care_messages(sender_id);
CREATE INDEX idx_messages_receiver ON elder_care_messages(receiver_id);
CREATE INDEX idx_emergency_calls_caller ON emergency_calls(caller_id);
```

**3. 更新 .env 文件**

在项目根目录的 `.env` 文件中填写 Supabase 配置：

```env
# Supabase (backend)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 火山引擎配置（已配置）

`.env` 文件中已包含火山引擎的测试密钥：
- AI 对话（豆包大模型）
- 语音合成（TTS）
- 语音识别（ASR）

这些密钥可以直接使用，无需额外配置。

## 🧪 运行测试

### 前端测试

```bash
# 运行所有测试
npm test

# 或使用 vitest
npx vitest run

# 查看测试覆盖率
npx vitest run --coverage
```

测试结果示例：
```
✓ 506 tests passed (30 test files)
```

### 后端测试

```bash
cd backend

# 激活虚拟环境（如果未激活）
venv\Scripts\activate

# 运行所有测试
python -m pytest

# 运行特定测试文件
python -m pytest tests/test_auth.py

# 查看详细输出
python -m pytest -v

# 查看测试覆盖率
python -m pytest --cov=.
```

测试结果示例：
```
====== 270 passed in 15.23s ======
```

## 📱 测试功能模块

### 1. 测试用户认证

**注册新用户**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "password": "password123",
    "name": "测试用户",
    "role": "elder"
  }'
```

**用户登录**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "password": "password123"
  }'
```

返回的 `access_token` 用于后续 API 调用。

### 2. 测试 AI 对话

访问前端页面：http://localhost:3000/voice

或使用 API：
```bash
curl -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "你好，今天天气怎么样？",
    "user_id": "user-uuid-here"
  }'
```

### 3. 测试语音功能

**文字转语音（TTS）**
```bash
curl -X POST http://localhost:8000/api/v1/ai/voice/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "text": "您好，这是语音测试",
    "voice_type": "BV700_V2_streaming"
  }'
```

### 4. 测试用药管理

访问前端页面：http://localhost:3000/medicine

### 5. 测试健康记录

访问前端页面：http://localhost:3000/health

### 6. 测试消息功能

访问前端页面：http://localhost:3000/messages

## 🐛 常见问题

### 问题 1：后端启动失败 - 端口被占用

**错误信息**：
```
ERROR: [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)
```

**解决方案**：
```bash
# 方法 1：使用其他端口
uvicorn main:app --reload --host 127.0.0.1 --port 8001

# 方法 2：查找并关闭占用端口的进程
netstat -ano | findstr :8000
taskkill /PID <进程ID> /F
```

### 问题 2：前端启动失败 - 端口被占用

**解决方案**：
```bash
# Next.js 会自动尝试下一个可用端口（3001, 3002...）
# 或手动指定端口
npm run dev -- -p 3001
```

### 问题 3：Python 虚拟环境激活失败

**Windows PowerShell 执行策略错误**：
```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**或使用 CMD**：
```cmd
venv\Scripts\activate.bat
```

### 问题 4：Supabase 连接失败

**检查清单**：
1. 确认 `.env` 文件中的 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 已正确填写
2. 确认 Supabase 项目状态为 Active
3. 确认数据库表已创建
4. 检查网络连接

### 问题 5：火山引擎 API 调用失败

**可能原因**：
- API 密钥过期或无效
- 网络连接问题
- API 配额用尽

**解决方案**：
- 检查 `.env` 文件中的火山引擎配置
- 访问火山引擎控制台检查 API 状态
- 查看后端日志获取详细错误信息

### 问题 6：前端无法连接后端

**检查清单**：
1. 确认后端服务已启动（访问 http://localhost:8000/health）
2. 检查浏览器控制台的网络请求
3. 确认 CORS 配置正确（后端已配置允许所有来源）

## 📊 性能测试

### 后端 API 性能测试

使用 Apache Bench (ab) 或类似工具：

```bash
# 安装 ab (Windows 需要安装 Apache)
# 测试健康检查接口
ab -n 1000 -c 10 http://localhost:8000/health
```

### 前端性能测试

使用浏览器开发者工具：
1. 打开 Chrome DevTools (F12)
2. 切换到 Lighthouse 标签
3. 运行性能分析

## 🔒 安全注意事项

### 开发环境
- `.env` 文件包含敏感信息，不要提交到 Git
- 使用的火山引擎密钥仅用于测试，生产环境需更换
- JWT_SECRET 在生产环境必须更换为强密码

### 生产环境
- 更换所有默认密钥和密码
- 启用 HTTPS
- 配置适当的 CORS 策略
- 启用 Supabase Row Level Security (RLS)

## 📝 开发工作流

### 推荐的开发流程

1. **启动服务**
   - 终端 1：启动后端 `cd backend && uvicorn main:app --reload`
   - 终端 2：启动前端 `npm run dev`

2. **开发功能**
   - 修改代码（热重载自动生效）
   - 在浏览器中测试

3. **运行测试**
   - 前端：`npm test`
   - 后端：`cd backend && python -m pytest`

4. **提交代码**
   - 确保所有测试通过
   - 遵循提交规范（feat/fix/docs 等）

## 🎯 下一步

完成本地测试后，你可以：

1. **构建生产版本**
   ```bash
   # 前端
   npm run build
   
   # 后端（使用生产配置）
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **构建 Android APK**
   ```bash
   cd android
   bash build_apk.sh
   ```

3. **部署到服务器**
   - 参考 `README.md` 中的部署章节
   - 参考 `docs/04-development/README.md` 了解更多开发细节

## 📚 相关文档

- [项目 README](../../README.md)
- [API 快速参考](./MCP_QUICK_REFERENCE.md)
- [MCP 配置指南](./MCP_COMPLETE_SETUP_GUIDE.md)
- [开发文档](../04-development/README.md)

---

**祝你测试顺利！** 🎉

如有问题，请查看项目 Issue 或提交新的 Issue。
