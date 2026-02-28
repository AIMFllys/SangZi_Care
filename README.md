# 桑梓智护（SangZi Smart Care）

> 面向老年人及其家属的智能养老移动应用 — "智护银龄" APP

## 🚀 快速开始本地测试

**新手？5 分钟快速启动！**

1. **查看快速指南**: [QUICK_START.md](docs/03-tutorials/QUICK_START.md) ⭐
2. **双击启动脚本**: `scripts/start-dev.bat` (Windows)
3. **访问应用**: http://localhost:3000

**需要帮助？**
- 📋 [配置检查清单](docs/03-tutorials/CHECKLIST.md)
- 🔧 [故障排查指南](docs/03-tutorials/TROUBLESHOOTING.md)
- 📚 [完整测试文档](docs/03-tutorials/LOCAL_TESTING_INDEX.md)

---

## 项目简介

**桑梓智护**是项目名称，其移动应用产品名为**"智护银龄"**。这是一款专为老年人设计的智能养老移动应用，提供健康管理、用药提醒、语音交互、紧急呼叫、家庭互联等功能。应用采用适老化设计，支持大字体、高对比度、语音交互等特性，让老年人轻松使用智能手机。

- **项目名称**: 桑梓智护（SangZi Smart Care）
- **APP 名称**: 智护银龄
- **目标用户**: 老年人及其家属

### 核心功能

- **🎤 AI 语音助手** — 基于火山引擎豆包大模型的智能对话，支持语音识别和语音合成
- **💊 用药管家** — 用药计划、服药提醒、用药记录管理
- **❤️ 健康记录** — 血压、血糖、心率等健康数据记录与趋势分析
- **💬 捂话（家庭消息）** — 家属与老人之间的文字/语音消息沟通
- **🚨 紧急呼叫** — 一键紧急呼叫家属，支持位置共享
- **📻 健康广播** — 健康资讯、养生知识推送
- **👨‍👩‍👧‍👦 家庭绑定** — 家属与老人账号绑定，远程关怀
- **⚙️ 适老化设计** — 大字体、高对比度、简化操作流程

## 技术栈

### 前端
- **框架**: Next.js 16 (App Router) + React 19 + TypeScript
- **状态管理**: Zustand 5
- **样式**: CSS Modules + CSS 变量（适老化主题）
- **测试**: Vitest + React Testing Library
- **构建**: 静态导出 (Static Export)

### 后端
- **框架**: Python FastAPI
- **数据库**: Supabase (PostgreSQL)
- **认证**: JWT + Supabase Auth
- **AI 服务**: 火山引擎豆包大模型 (Doubao)
- **语音服务**: 火山引擎 TTS/ASR
- **测试**: pytest

### 移动端
- **Android**: WebView + JSBridge (Kotlin)
- **最低版本**: Android 8.0 (API 26)

## 项目结构

```
.
├── app/                      # Next.js App Router 页面
│   ├── login/               # 登录页
│   ├── onboarding/          # 角色选择页
│   ├── voice/               # AI 语音助手页
│   ├── medicine/            # 用药管家
│   ├── health/              # 健康记录
│   ├── messages/            # 捂话（消息）
│   ├── radio/               # 健康广播
│   ├── family/              # 家庭成员
│   └── settings/            # 设置
├── components/              # React 组件
│   ├── ui/                  # 基础 UI 组件
│   ├── home/                # 首页组件
│   ├── voice/               # 语音组件
│   ├── medicine/            # 用药组件
│   ├── health/              # 健康组件
│   └── messages/            # 消息组件
├── stores/                  # Zustand 状态管理
├── hooks/                   # React Hooks
├── lib/                     # 工具库
│   ├── api.ts              # API 封装
│   ├── constants.ts        # 常量定义
│   ├── jsbridge.ts         # JSBridge 接口
│   ├── realtimeSubscriptions.ts  # Supabase Realtime 订阅
│   └── offlineSync.ts      # 离线数据同步
├── styles/                  # 全局样式
│   ├── globals.css         # 全局样式 + CSS 变量
│   ├── elder-theme.css     # 老年人端主题
│   └── family-theme.css    # 家属端主题
├── types/                   # TypeScript 类型定义
├── backend/                 # FastAPI 后端
│   ├── api/v1/             # API 路由
│   ├── services/           # 业务服务
│   ├── models/             # 数据模型
│   ├── core/               # 核心模块（认证、中间件）
│   └── tests/              # 后端测试
└── android/                 # Android WebView 项目
    ├── app/src/main/kotlin/ # Kotlin 源码
    └── build_apk.sh        # APK 构建脚本
```

## 快速开始

> 💡 **新手推荐**: 查看 [docs/03-tutorials/QUICK_START.md](docs/03-tutorials/QUICK_START.md) 获取一键启动指南！

### 环境要求

- Node.js 18+
- Python 3.9+
- Android SDK 34 (仅构建 APK 时需要)

### 1. 克隆项目

```bash
git clone <repository-url>
cd sangzi-smart-care  # 项目目录名
```

### 2. 配置环境变量

复制 `.env` 文件并填写必要的配置：

```bash
cp .env .env.local
```

需要配置的环境变量：

```env
# 火山引擎 API 密钥（AI 对话）
VOLCANO_ARK_API_KEY=your-ark-api-key

# 火山引擎语音服务
VOLCANO_APP_ID=your-app-id
VOLCANO_ACCESS_TOKEN=your-access-token
VOLCANO_SECRET_KEY=your-secret-key
VOLCANO_TTS_RESOURCE_ID=your-tts-resource-id
VOLCANO_ASR_STREAM_RESOURCE_ID=your-asr-resource-id

# Supabase 配置
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT 密钥（生产环境请更换）
JWT_SECRET=your-jwt-secret-change-in-production
```

### 3. 安装依赖

**前端依赖：**
```bash
npm install
```

**后端依赖：**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. 启动开发服务器

**前端开发服务器：**
```bash
npm run dev
```
访问 http://localhost:3000

**后端开发服务器：**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
访问 http://localhost:8000/docs 查看 API 文档

### 5. 运行测试

**前端测试：**
```bash
npm test
# 或
npx vitest run
```

**后端测试：**
```bash
cd backend
python -m pytest
```

### 6. 构建生产版本

**前端静态导出：**
```bash
npm run build
```
输出目录：`out/`

**后端部署：**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 7. 构建 Android APK（智护银龄 APP）

```bash
cd android
bash build_apk.sh
```

APK 输出路径：`android/app/build/outputs/apk/release/app-release.apk`

APK 包名：`com.sangzi.smartcare`  
APP 显示名称：智护银龄

详细说明请参考 [android/README.md](android/README.md)

## 测试覆盖

- **前端测试**: 506 个测试用例，30 个测试文件
- **后端测试**: 270 个测试用例

测试覆盖所有核心功能模块：认证、用户管理、用药管理、健康记录、消息、紧急呼叫、健康广播、家庭绑定、AI 对话、语音服务等。

## 适老化设计规范

### 视觉设计
- **字体大小**: 老年人端最小 20px，标题 ≥28px
- **触控区域**: 最小 48x48px
- **颜色对比度**: ≥4.5:1
- **主题**: 支持老年人端和家属端双主题切换

### 交互设计
- **简化操作**: 减少操作步骤，避免复杂手势
- **语音交互**: 全功能支持语音输入和语音反馈
- **视觉反馈**: 所有操作提供明确的视觉和语音反馈
- **容错设计**: 提供撤销、确认等容错机制

## API 文档

后端 API 遵循 RESTful 规范，所有接口需要 JWT 认证（除登录/注册接口）。

启动后端服务后访问 http://localhost:8000/docs 查看完整的 API 文档（Swagger UI）。

### 主要 API 端点

- `POST /api/v1/auth/login` — 用户登录
- `POST /api/v1/auth/register` — 用户注册
- `GET /api/v1/users/me` — 获取当前用户信息
- `GET /api/v1/medicine/plans` — 获取用药计划
- `POST /api/v1/health/records` — 创建健康记录
- `GET /api/v1/messages` — 获取消息列表
- `POST /api/v1/emergency/call` — 发起紧急呼叫
- `POST /api/v1/ai/chat` — AI 对话
- `POST /api/v1/ai/voice/tts` — 文字转语音
- `POST /api/v1/ai/voice/asr` — 语音识别

## 数据库设计

使用 Supabase (PostgreSQL) 作为数据库，主要表结构：

- `users` — 用户表
- `elder_family_binds` — 家庭绑定关系
- `medication_plans` — 用药计划
- `medication_records` — 用药记录
- `health_records` — 健康记录
- `elder_care_messages` — 消息表
- `emergency_calls` — 紧急呼叫记录
- `broadcast_messages` — 健康广播消息

详细的数据库设计请参考 `.kiro/specs/sangzi-smart-care-mobile/design.md`

## 实时功能

应用支持以下实时功能（基于 Supabase Realtime）：

- 健康记录实时同步
- 用药记录实时更新
- 消息实时推送
- 紧急呼叫实时通知

实时订阅管理器位于 `lib/realtimeSubscriptions.ts`

## 离线支持

应用支持离线数据缓存和自动同步：

- 离线时数据写入本地队列
- 网络恢复后自动同步到服务器
- 支持的离线操作：健康记录、用药记录、消息发送

离线同步管理器位于 `lib/offlineSync.ts`

## 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks
- 样式使用 CSS Modules
- 所有 UI 文本和注释使用中文

### 本地测试文档

- **[快速开始](docs/03-tutorials/QUICK_START.md)** - 5 分钟快速启动指南
- **[配置检查清单](docs/03-tutorials/CHECKLIST.md)** - 验证环境配置
- **[完整测试指南](docs/03-tutorials/LOCAL_TESTING_GUIDE.md)** - 详细配置和测试说明
- **[故障排查](docs/03-tutorials/TROUBLESHOOTING.md)** - 常见问题解决方案
- **[文档索引](docs/03-tutorials/LOCAL_TESTING_INDEX.md)** - 所有测试文档导航

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

### 分支管理

- `main` — 主分支，保持稳定
- `develop` — 开发分支
- `feature/*` — 功能分支
- `fix/*` — 修复分支

## 部署

### 前端部署

前端使用静态导出，可部署到任何静态托管服务：

```bash
npm run build
# 将 out/ 目录部署到服务器
```

推荐部署平台：
- Vercel
- Netlify
- 阿里云 OSS
- 腾讯云 COS

### 后端部署

后端可部署到任何支持 Python 的服务器：

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

推荐部署方式：
- Docker 容器化部署
- 云服务器 (阿里云、腾讯云)
- Serverless (AWS Lambda、阿里云函数计算)

### 数据库

使用 Supabase 托管的 PostgreSQL 数据库，无需自行部署。

## 许可证

[MIT License](LICENSE)

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

---

**桑梓智护 · 智护银龄** — 让科技温暖每一位老人 ❤️
