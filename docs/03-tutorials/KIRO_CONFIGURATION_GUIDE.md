# 🎯 Kiro 配置指南：Skills、Agents 和 Supabase Power

> **项目：** 桑梓智护  
> **创建日期：** 2026-02-25  
> **目的：** 配置 Kiro 的 Skills、Agents 和 Supabase MCP Server

---

## 一、Skills 配置（技能模块）

### 1.1 什么是 Skills？

Skills 是**知识模块**，包含特定领域的最佳实践和指导原则。它们存放在 `.agent/skills/` 目录下。

### 1.2 已有的 Skills（无需安装）

你的项目已经包含以下 Skills，**直接使用即可**：

#### 前端相关

| Skill | 用途 | 使用场景 |
|-------|------|---------|
| `frontend-design` | UI/UX 设计原则、色彩系统、排版 | 设计适老化界面、选择色板 |
| `react-best-practices` | React 性能优化（Vercel 57条规则） | 组件优化、懒加载 |
| `tailwind-patterns` | Tailwind CSS v4 工具类 | 快速样式实现 |
| `web-design-guidelines` | 100+条 Web 审计规则 | 无障碍性检查、性能优化 |
| `ui-ux-pro-max` | 50种风格+21色板+50字体 | 选择适合老年人的设计 |

#### 后端相关

| Skill | 用途 | 使用场景 |
|-------|------|---------|
| `python-patterns` | Python 最佳实践、FastAPI | 后端 API 开发 |
| `api-patterns` | REST/GraphQL/tRPC 设计 | API 设计、认证 |
| `database-design` | 数据库设计、索引优化 | 表结构设计、RLS 策略 |

#### 测试与部署

| Skill | 用途 | 使用场景 |
|-------|------|---------|
| `testing-patterns` | Jest/Vitest 测试策略 | 单元测试、集成测试 |
| `webapp-testing` | E2E 测试、Playwright | 端到端测试 |
| `deployment-procedures` | CI/CD、部署流程 | 自动化部署 |
| `docker-expert` | 容器化、Docker Compose | 开发环境、生产部署 |

#### 其他

| Skill | 用途 | 使用场景 |
|-------|------|---------|
| `clean-code` | 代码规范、最佳实践 | 代码审查 |
| `vulnerability-scanner` | 安全审计、OWASP | 安全检查 |
| `architecture` | 系统设计模式 | 架构设计 |

### 1.3 如何使用 Skills？

#### 方法 1：在对话中直接提及

```bash
# 示例 1：使用 frontend-design
"请参考 frontend-design skill，帮我设计一个适老化的大按钮组件，
要求：字体≥24px、按钮≥60px、高对比度"

# 示例 2：使用 database-design
"请使用 database-design skill 设计用药管理的表结构，
需要支持多时段用药、药物间隔规则、实际vs计划时间记录"

# 示例 3：使用 api-patterns
"请参考 api-patterns skill 设计语音识别的 API，
需要支持三级降级链：Web Speech API → Android Native → 豆包 ASR"
```

#### 方法 2：让 Agent 自动加载

当你使用 Agent 时，它会自动加载相关的 Skills（见下一节）。

---

## 二、Agents 配置（专家代理）

### 2.1 什么是 Agents？

Agents 是**专家角色**，每个 Agent 都有特定的专业领域，并会自动加载相关的 Skills。

### 2.2 已有的 Agents（无需安装）

你的项目已经包含以下 Agents，**直接使用即可**：

#### 开发相关

| Agent | 自动加载的 Skills | 适用场景 |
|-------|------------------|---------|
| `frontend-specialist` | react-best-practices<br>frontend-design<br>tailwind-patterns<br>web-design-guidelines | 前端开发<br>UI 组件设计<br>适老化界面 |
| `backend-specialist` | python-patterns<br>api-patterns<br>database-design<br>nodejs-best-practices | 后端 API 开发<br>FastAPI 实现<br>豆包 AI 集成 |
| `database-architect` | database-design<br>prisma-expert | 数据库设计<br>Supabase 表结构<br>RLS 策略 |
| `mobile-developer` | mobile-design | WebView APK 打包<br>移动端适配 |

#### 规划与测试

| Agent | 自动加载的 Skills | 适用场景 |
|-------|------------------|---------|
| `project-planner` | brainstorming<br>plan-writing<br>architecture | 任务拆解<br>依赖分析<br>里程碑规划 |
| `test-engineer` | testing-patterns<br>webapp-testing<br>tdd-workflow | 测试策略<br>E2E 测试<br>单元测试 |
| `qa-automation-engineer` | webapp-testing<br>testing-patterns | 自动化测试<br>CI 集成 |

#### 安全与部署

| Agent | 自动加载的 Skills | 适用场景 |
|-------|------------------|---------|
| `security-auditor` | vulnerability-scanner<br>red-team-tactics | 安全审计<br>健康数据加密<br>权限控制 |
| `devops-engineer` | deployment-procedures<br>docker-expert | CI/CD 配置<br>Docker 部署<br>监控告警 |

#### 其他

| Agent | 自动加载的 Skills | 适用场景 |
|-------|------------------|---------|
| `debugger` | systematic-debugging | 系统性排查问题 |
| `performance-optimizer` | performance-profiling | 性能优化 |
| `documentation-writer` | documentation-templates | 文档编写 |

### 2.3 如何使用 Agents？

#### 方法 1：在对话中直接调用

```bash
# 示例 1：使用 frontend-specialist
"请以 frontend-specialist 的身份，帮我设计语音球组件。
要求：
- 直径≥120px，占屏幕宽度40%
- 点击触发语音识别
- 有呼吸动画效果
- 适老化设计（高对比度、大尺寸）"

# 示例 2：使用 backend-specialist
"请以 backend-specialist 的身份，设计用药提醒的 API。
要求：
- FastAPI 框架
- 支持定时任务（APScheduler）
- 调用豆包 TTS 生成语音
- 推送到前端（WebSocket）"

# 示例 3：使用 database-architect
"请以 database-architect 的身份，设计家属绑定系统的表结构。
要求：
- 支持双向绑定（老人↔家属）
- 6位数字绑定码
- RLS 策略（老人只能看自己的绑定关系）"

# 示例 4：使用 project-planner
"请以 project-planner 的身份，帮我拆解'语音助手三级降级链'的开发任务，
包括依赖关系和时间估算"
```

#### 方法 2：使用 Sub-Agent 系统（高级）

```bash
# 使用 invokeSubAgent 工具
"请调用 frontend-specialist agent 帮我设计适老化 UI 组件库"
```

---

## 三、Supabase Power 配置（MCP Server）

### 3.1 什么是 Supabase MCP Server？

Supabase MCP Server 是一个 **Model Context Protocol** 服务器，允许 AI 直接与你的 Supabase 数据库交互。

#### 功能

- ✅ 查询数据（SELECT）
- ✅ 创建/修改表结构（CREATE TABLE, ALTER TABLE）
- ✅ 执行 SQL 语句
- ✅ 管理 Storage（上传/下载文件）
- ✅ 查看项目配置
- ✅ 管理 RLS 策略

### 3.2 配置步骤

#### 步骤 1：获取 Supabase 凭证

**需要 3 个凭证：**

1. **Project URL**
   - 登录 [Supabase Dashboard](https://supabase.com/dashboard)
   - 选择项目 → Settings → API
   - 复制 "Project URL"（例如：`https://xxxxx.supabase.co`）

2. **Service Role Key**
   - 同一页面，复制 "service_role" key
   - ⚠️ 保密，不要提交到 Git

3. **Access Token（Personal Access Token）** ⭐ 重要
   - 点击右上角头像 → Account Settings
   - 左侧菜单选择 "Access Tokens"
   - 点击 "Generate New Token"
   - 输入名称（如 `kiro-mcp-token`）
   - 选择权限范围（建议 "All"）
   - 点击 "Generate Token"
   - ⚠️ **立即复制保存！** Token 只显示一次
   - Token 格式：`sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

详细步骤见：[GET_SUPABASE_ACCESS_TOKEN.md](GET_SUPABASE_ACCESS_TOKEN.md)

#### 步骤 2：配置 MCP Server

已为你创建配置文件 `.kiro/settings/mcp.json`，请按以下步骤修改：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--access-token",
        "sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  // ← 替换为你的 Access Token
      ],
      "env": {
        "SUPABASE_URL": "https://xxxxx.supabase.co",  // ← 替换为你的 Project URL
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // ← 替换为你的 Service Role Key
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

**备选方案（使用环境变量）：**

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://xxxxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

#### 步骤 3：重启 Kiro

配置完成后，重启 Kiro 以加载 MCP Server。

### 3.3 如何使用 Supabase Power？

#### 示例 1：查询数据

```bash
"请使用 Supabase Power 查询 users 表中所有老年人用户（role='elder'）"
```

#### 示例 2：创建表

```bash
"请使用 Supabase Power 创建 medication_plans 表，字段包括：
- id (UUID, 主键)
- user_id (UUID, 外键 → users.id)
- medicine_name (VARCHAR)
- dosage (VARCHAR)
- time_slots (JSONB)
- created_at (TIMESTAMPTZ)"
```

#### 示例 3：执行 SQL

```bash
"请使用 Supabase Power 执行以下 SQL：
SELECT u.name, COUNT(m.id) as medication_count
FROM users u
LEFT JOIN medication_plans m ON u.id = m.user_id
WHERE u.role = 'elder'
GROUP BY u.id, u.name"
```

#### 示例 4：设置 RLS 策略

```bash
"请使用 Supabase Power 为 health_records 表设置 RLS 策略：
- 老年人只能查看自己的健康记录
- 家属可以查看已绑定老人的健康记录"
```

### 3.4 安全注意事项

⚠️ **Service Role Key 拥有完全权限，请妥善保管！**

- ❌ 不要提交到 Git（已添加到 `.gitignore`）
- ❌ 不要分享给他人
- ✅ 使用环境变量存储
- ✅ 定期轮换密钥

---

## 四、实战示例：开发语音助手模块

### 4.1 任务拆解（使用 project-planner）

```bash
"请以 project-planner 的身份，帮我拆解'语音助手三级降级链'的开发任务。

需求：
1. 优先使用 Web Speech API（浏览器原生）
2. 降级到 Android Native（JSBridge）
3. 最后降级到豆包 ASR（火山引擎 API）

请给出：
- 详细任务清单
- 依赖关系
- 时间估算"
```

### 4.2 前端组件设计（使用 frontend-specialist）

```bash
"请以 frontend-specialist 的身份，设计语音球组件。

要求：
- 参考 frontend-design skill 的适老化设计原则
- 直径≥120px，占屏幕宽度40%
- 点击触发语音识别
- 有呼吸动画效果（使用 animation-guide.md）
- 高对比度、大尺寸
- 使用 Tailwind CSS

请提供：
1. 组件代码（TypeScript + React）
2. 样式代码（Tailwind）
3. 动画实现"
```

### 4.3 后端 API 设计（使用 backend-specialist）

```bash
"请以 backend-specialist 的身份，设计语音识别的 API。

要求：
- 参考 api-patterns skill 的 REST API 设计原则
- FastAPI 框架
- 支持三级降级链：
  1. 前端先尝试 Web Speech API
  2. 失败后调用 /api/v1/voice/recognize（Android Native）
  3. 再失败后调用豆包 ASR
- 输入：音频文件（Blob）
- 输出：识别文本（JSON）

请提供：
1. API 路由设计
2. 请求/响应格式
3. 错误处理"
```

### 4.4 数据库设计（使用 database-architect + Supabase Power）

```bash
"请以 database-architect 的身份，设计 AI 对话记录的表结构。

要求：
- 参考 database-design skill
- 使用 Supabase Power 创建表
- 字段包括：
  - id (UUID, 主键)
  - user_id (UUID, 外键 → users.id)
  - session_id (UUID, 会话 ID)
  - role (VARCHAR, 'user' | 'assistant')
  - content (TEXT, 对话内容)
  - audio_url (TEXT, 语音文件 URL，可选)
  - created_at (TIMESTAMPTZ)
- RLS 策略：用户只能查看自己的对话记录

请提供：
1. CREATE TABLE 语句
2. RLS 策略 SQL
3. 索引优化建议"
```

### 4.5 测试（使用 test-engineer）

```bash
"请以 test-engineer 的身份，设计语音识别降级链的测试用例。

要求：
- 参考 testing-patterns skill
- 单元测试（Vitest）
- E2E 测试（Playwright）

测试场景：
1. Web Speech API 可用时，使用浏览器原生
2. Web Speech API 不可用时，降级到 Android Native
3. Android Native 不可用时，降级到豆包 ASR
4. 所有方式都失败时，显示错误提示

请提供：
1. 单元测试代码
2. E2E 测试代码
3. Mock 策略"
```

---

## 五、常见问题

### Q1: Skills 和 Agents 有什么区别？

- **Skills**：知识模块，包含最佳实践和指导原则
- **Agents**：专家角色，会自动加载相关 Skills，并以特定身份回答问题

### Q2: 如何知道某个 Skill 的具体内容？

```bash
"请展示 frontend-design skill 的内容"
```

### Q3: 可以同时使用多个 Agents 吗？

可以，但建议一次使用一个 Agent，避免混淆。

### Q4: Supabase Power 的权限如何控制？

通过 `autoApprove` 字段控制：

```json
{
  "autoApprove": [
    "query_*",      // 自动批准所有查询操作
    "create_table"  // 自动批准创建表操作
  ]
}
```

留空表示每次都需要手动批准。

### Q5: 如何查看所有可用的 MCP 工具？

```bash
"请列出 Supabase Power 的所有可用工具"
```

---

## 六、下一步行动

### 1. 配置 Supabase MCP Server

- [ ] 获取 Supabase 凭证
- [ ] 修改 `.kiro/settings/mcp.json`
- [ ] 重启 Kiro

### 2. 开始使用 Skills 和 Agents

```bash
# 示例：开始设计适老化 UI
"请以 frontend-specialist 的身份，参考 frontend-design 和 ui-ux-pro-max skills，
帮我设计桑梓智护的首页。

要求：
- 语音球居中，占屏幕宽度40%
- 上滑显示功能卡片列表
- 左右滑显示家属卡片
- 适老化设计（大字体、高对比度、简洁布局）
- 使用暖色调色板（避免紫色）"
```

### 3. 使用 Supabase Power 创建数据库

```bash
# 示例：创建用户表
"请使用 Supabase Power 创建 users 表，参考 docs/plan.md 中的数据库设计"
```

---

## 七、参考资源

- [Supabase MCP 官方文档](https://supabase.com/docs/guides/getting-started/mcp)
- [Model Context Protocol 规范](https://modelcontextprotocol.io/)
- [Kiro Skills 文档](.agent/skills/doc.md)
- [项目架构文档](.agent/ARCHITECTURE.md)

---

*本文档为 Kiro 配置指南，帮助你充分利用 Skills、Agents 和 Supabase Power 进行开发。*
