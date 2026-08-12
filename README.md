# 桑梓智护 · SangZi Smart Care

> 面向老年人及其家属的智能养老应用 — **智护银龄**  
> 全栈 **Next.js** · 部署 **腾讯云 EdgeOne Pages** · 手机端为**在线 WebView/浏览器壳**

[探索文档](docs/README.md) · [目标架构](docs/designs/target-architecture.md) · [AGENTS.md](AGENTS.md)

---

## 简介

**桑梓智护**提供健康管理、用药提醒、家庭消息（捂话）、绑定关怀、AI 语音助手等能力，采用适老化双主题（Elder 暖色 / Family 冷色）。

| | |
|--|--|
| 项目名 | 桑梓智护（SangZi Smart Care） |
| APP 名 | 智护银龄 |
| 包名 | `sangzi-smart-care` |
| 当前版本 | `v1.2.0` |

---

## 核心功能

| 功能 | 说明 |
|------|------|
| AI 语音助手 | MiMo v2.5 Pro 陪伴、健康记录工具与碎碎念分享 |
| 用药管家 | 长辈/家属协同配置计划、提醒、确认与依从率统计 |
| 健康记录 | 长辈本人录入；获授权家属代录与看板统计 |
| 消息 | 家属与长辈文字/语音消息、碎碎念标签与未读管理 |
| 家庭绑定 | 长辈相对家属的关系、健康/用药分域权限 |
| 健康广播 | 资讯推荐（部分实现） |
| 紧急呼叫 | 后端就绪、前端待补齐 |
| 适老化 | 大字体、高对比、简化操作 |

成熟度详见 [docs/详解/功能详解.md](docs/详解/功能详解.md)。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js ≥16.2（App Router，**全栈**，非静态导出） |
| UI | React 19 · CSS Modules 双主题 · Tailwind v4 工具层 |
| 状态 | Zustand 5 |
| 数据 | Supabase（publishable / secret 新密钥体系） |
| 部署 | 腾讯云 EdgeOne Pages / Makers（产物 `.next`） |
| 移动端 | Android WebView 打开线上 https |

---

## 快速开始

### 环境

- Node.js 22.x 推荐（EdgeOne 预装 22.11.0）
- npm（本仓库包管理）

### 安装与运行

```bash
cp .env.example .env.local
# 编辑 .env.local：填入 Supabase URL / publishable key 等

npm install
npm run dev
```

打开 [http://localhost:7742](http://localhost:7742)。  
探针：`GET http://localhost:7742/api/ping`。

### API

业务 API 由 Next.js 同源提供（`/api/v1/...`），无需独立后端进程。  
详见 [docs/ops/local-setup.md](docs/ops/local-setup.md)。

### 构建

```bash
npm run build
npm start
```

---

## 项目结构（摘要）

```
app/           # 页面与 app/api
components/    # UI / 业务组件
hooks/ lib/ stores/ styles/ types/
android/       # 在线壳
docs/          # 详解 · designs · ops · archive
scripts/       # setup · build · deploy · dev
AGENTS.md      # AI / 协作规范
edgeone.json   # EdgeOne 部署配置
```

完整说明：[docs/详解/项目结构详解.md](docs/详解/项目结构详解.md)

---

## 环境变量

见 [.env.example](.env.example) 与 [docs/ops/env-config.md](docs/ops/env-config.md)。

要点：

- `NEXT_PUBLIC_*` 进入浏览器；其余仅服务端 / EdgeOne
- Supabase：`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY`（替代旧 anon / service_role）
- 本地 `.env.local` 与 EdgeOne 控制台**同名键**同步

---

## 部署（EdgeOne）

1. 控制台导入 Git 仓库  
2. 同步环境变量  
3. 构建使用 `npm run build`，全栈输出 **`.next`**（见 `edgeone.json`）  
4. 手机壳 / 浏览器访问分配的 https 域名  

步骤：[docs/ops/deploy-edgeone.md](docs/ops/deploy-edgeone.md)

---

## Android

配置 `app_base_url` 为 EdgeOne 或预览地址后构建 APK。  
**不要**再拷贝 `out/` 到 assets。说明见 [android/README.md](android/README.md)。

---

## 文档与规范

- [AGENTS.md](AGENTS.md) — 编码代理与工程边界  
- [docs/README.md](docs/README.md) — 文档索引  
- [docs/designs/target-architecture.md](docs/designs/target-architecture.md) — 架构终局  
- [docs/issues/tech-debt.md](docs/issues/tech-debt.md) — 技术债务  

---

## 许可证

MIT
