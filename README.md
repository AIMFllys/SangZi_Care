<p align="center">
  <h1 align="center">桑梓智护 · SangZi Smart Care</h1>
  <p align="center">
    面向老年人及其家属的智能养老移动应用 — <strong>智护银龄</strong> APP
    <br />
    <a href="docs/README.md"><strong>探索文档 »</strong></a>
    <br />
    <br />
    <a href="https://github.com/AIMFllys/SangZi_Care/issues">报告 Bug</a>
    ·
    <a href="https://github.com/AIMFllys/SangZi_Care/issues">请求功能</a>
  </p>
</p>

<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" />
  </a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node.js >= 18" />
  <img src="https://img.shields.io/badge/python-%3E%3D3.9-blue.svg" alt="Python >= 3.9" />
  <img src="https://img.shields.io/badge/Next.js-16-black.svg" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-latest-009688.svg" alt="FastAPI" />
</p>

---

## 📖 目录

- [简介](#简介)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [运行测试](#运行测试)
- [构建与部署](#构建与部署)
- [适老化设计规范](#适老化设计规范)
- [API 文档](#api-文档)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 简介

**桑梓智护**（SangZi Smart Care）是一款专为老年人设计的智能养老移动应用，产品名称为 **"智护银龄"**。应用提供健康管理、用药提醒、语音交互、紧急呼叫、家庭互联等功能，采用适老化设计，支持大字体、高对比度、语音交互等特性，让老年人轻松使用智能手机。

- **项目名称**：桑梓智护（SangZi Smart Care）
- **APP 名称**：智护银龄
- **目标用户**：老年人及其家属

---

## 核心功能

| 功能 | 描述 |
| --- | --- |
| 🎤 **AI 语音助手** | 基于火山引擎豆包大模型的智能对话，支持语音识别与语音合成 |
| 💊 **用药管家** | 用药计划、服药提醒、用药记录管理 |
| ❤️ **健康记录** | 血压、血糖、心率等健康数据记录与趋势分析 |
| 💬 **捂话（家庭消息）** | 家属与老人之间的文字 / 语音消息沟通 |
| 🚨 **紧急呼叫** | 一键紧急呼叫家属，支持位置共享 |
| 📻 **健康广播** | 健康资讯、养生知识推送 |
| 👨‍👩‍👧‍👦 **家庭绑定** | 家属与老人账号绑定，远程关怀 |
| ⚙️ **适老化设计** | 大字体、高对比度、简化操作流程 |

---

## 技术栈

### 前端

| 技术 | 版本 / 说明 |
| --- | --- |
| Next.js | 16 (App Router) |
| React | 19 |
| TypeScript | 5.8+ |
| Zustand | 5 (状态管理) |
| CSS Modules | CSS 变量 + 适老化主题 |
| Vitest | 单元测试 + React Testing Library |

### 后端

| 技术 | 版本 / 说明 |
| --- | --- |
| Python FastAPI | API 服务 |
| Supabase | PostgreSQL 数据库 |
| JWT + Supabase Auth | 认证鉴权 |
| 火山引擎豆包 (Doubao) | AI 大模型 |
| 火山引擎 TTS / ASR | 语音合成 / 语音识别 |

### 移动端

| 技术 | 版本 / 说明 |
| --- | --- |
| Android WebView | Kotlin + JSBridge |
| 最低版本 | Android 8.0 (API 26) |

---

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
├── styles/                  # 全局样式
├── types/                   # TypeScript 类型定义
├── backend/                 # FastAPI 后端
│   ├── api/v1/             # API 路由
│   ├── services/           # 业务服务
│   ├── models/             # 数据模型
│   ├── core/               # 核心模块
│   └── tests/              # 后端测试
├── android/                 # Android WebView 项目
└── docs/                    # 项目文档
```

---

## 快速开始

### 环境要求

- **Node.js** >= 18
- **Python** >= 3.9
- **Android SDK 34**（仅构建 APK 时需要）

### 1. 克隆项目

```bash
git clone https://github.com/AIMFllys/SangZi_Care.git
cd SangZi_Care
```

### 2. 安装依赖

```bash
# 前端
npm install

# 后端
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
pip install -r requirements.txt
```

### 3. 启动开发服务器

```bash
# 前端（默认端口 7742）
npm run dev

# 后端（另开终端）
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> 🚀 **一键启动**：Windows 用户可双击 `scripts\dev.bat` 自动完成环境检查、依赖安装和服务启动。

---

## 环境变量配置

复制 `.env` 文件并根据需要修改：

```bash
cp .env .env.local
```

| 变量 | 说明 |
| --- | --- |
| `VOLCANO_ARK_API_KEY` | 火山引擎 API 密钥（AI 对话） |
| `VOLCANO_APP_ID` | 火山引擎 App ID |
| `VOLCANO_ACCESS_TOKEN` | 火山引擎 Access Token |
| `VOLCANO_SECRET_KEY` | 火山引擎 Secret Key |
| `VOLCANO_TTS_RESOURCE_ID` | TTS 资源 ID |
| `VOLCANO_ASR_STREAM_RESOURCE_ID` | ASR 资源 ID |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `JWT_SECRET` | JWT 签名密钥 |

---

## 运行测试

```bash
# 前端测试
npm test
# 或
npx vitest run

# 后端测试
cd backend
python -m pytest
```

- **前端**：506 个测试用例，30 个测试文件
- **后端**：270 个测试用例

---

## 构建与部署

### 前端静态导出

```bash
npm run build
# 输出目录: out/
```

推荐部署平台：Vercel · Netlify · 阿里云 OSS · 腾讯云 COS

### 后端部署

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

推荐部署方式：Docker · 云服务器 · Serverless

### 构建 Android APK

```bash
cd android
bash build_apk.sh
```

APK 输出路径：`android/app/build/outputs/apk/release/app-release.apk`

> 详细说明参考 [android/README.md](android/README.md)

---

## 适老化设计规范

| 规范项 | 要求 |
| --- | --- |
| 字体大小 | 老年人端最小 20px，标题 ≥ 28px |
| 触控区域 | 最小 48 × 48px |
| 颜色对比度 | ≥ 4.5:1 |
| 主题 | 老年人端 / 家属端双主题切换 |
| 交互 | 减少操作步骤，避免复杂手势 |
| 语音交互 | 全功能支持语音输入和语音反馈 |
| 容错设计 | 提供撤销、确认等容错机制 |

---

## API 文档

后端 API 遵循 RESTful 规范，所有接口需要 JWT 认证（除登录 / 注册接口）。

启动后端服务后访问 `http://localhost:8000/docs` 查看完整的 Swagger UI 文档。

<details>
<summary><strong>主要 API 端点</strong></summary>

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/api/v1/auth/login` | POST | 用户登录 |
| `/api/v1/auth/register` | POST | 用户注册 |
| `/api/v1/users/me` | GET | 获取当前用户信息 |
| `/api/v1/medicine/plans` | GET | 获取用药计划 |
| `/api/v1/health/records` | POST | 创建健康记录 |
| `/api/v1/messages` | GET | 获取消息列表 |
| `/api/v1/emergency/call` | POST | 发起紧急呼叫 |
| `/api/v1/ai/chat` | POST | AI 对话 |
| `/api/v1/ai/voice/tts` | POST | 文字转语音 |
| `/api/v1/ai/voice/asr` | POST | 语音识别 |

</details>

---

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: 添加某某功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

### 提交规范

| 前缀 | 说明 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更新 |
| `style` | 代码格式调整 |
| `refactor` | 代码重构 |
| `test` | 测试相关 |
| `chore` | 构建 / 工具链 |

### 分支管理

- `main` — 主分支，保持稳定
- `develop` — 开发分支
- `feature/*` — 功能分支
- `fix/*` — 修复分支

---

## 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

---

<p align="center">
  <strong>桑梓智护 · 智护银龄</strong> — 让科技温暖每一位老人 ❤️
</p>
