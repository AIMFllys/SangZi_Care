# 🛠️ MCP & Powers 配置指南

> **项目：** 桑梓智护 - 老年人智慧医养助手  
> **创建日期：** 2026-02-25  
> **用途：** 配置开发工具，提升开发效率

---

## 📋 目录

1. [当前配置状态](#当前配置状态)
2. [推荐 MCP Servers](#推荐-mcp-servers)
3. [推荐 Kiro Powers](#推荐-kiro-powers)
4. [配置步骤](#配置步骤)
5. [使用场景](#使用场景)

---

## 🎯 当前配置状态

### ✅ 已配置

| MCP Server | 状态 | 用途 |
|-----------|------|------|
| Supabase | ✅ 已启用 | 数据库管理、表查询、SQL 执行 |
| Shadcn | ⚠️ 已配置但禁用 | UI 组件快速添加 |
| Context7 | ⚠️ 已配置但禁用 | 上下文管理（需 API Key）|

### ⏳ 待配置

- Filesystem MCP - 文件管理
- GitHub MCP - 版本控制
- Brave Search MCP - 技术文档搜索
- PostgreSQL MCP - 数据库直接操作
- Puppeteer MCP - UI 自动化测试

---

## 🔥 推荐 MCP Servers

### 1. 必装（高优先级）⭐⭐⭐

#### A. Filesystem MCP
**用途**：管理项目文件、读写配置、生成代码

```json
"filesystem": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
  "disabled": false,
  "autoApprove": ["read_file", "list_directory"]
}
```

**使用场景**：
- 快速读取/修改配置文件
- 批量生成组件文件
- 项目结构分析

#### B. Shadcn MCP（启用现有配置）
**用途**：快速添加 UI 组件

```json
"shadcn": {
  "command": "npx",
  "args": ["shadcn@latest", "mcp"],
  "disabled": false,  // 改为 false
  "autoApprove": ["add"]
}
```

**使用场景**：
- 添加按钮、表单、对话框等组件
- 老年人友好的大字体组件
- 快速构建 UI 原型

---

### 2. 推荐安装（中优先级）⭐⭐

#### C. GitHub MCP
**用途**：管理 Issues、PR、代码审查

```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
  },
  "disabled": false,
  "autoApprove": ["list_issues", "get_issue"]
}
```

**获取 Token**：
1. 访问 https://github.com/settings/tokens
2. 生成 Personal Access Token
3. 权限选择：`repo`, `read:org`

**使用场景**：
- 自动创建 Issue
- 查看 PR 状态
- 代码审查辅助

#### D. Brave Search MCP
**用途**：搜索最新技术文档

```json
"brave-search": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "BSA_xxxxxxxxxxxx"
  },
  "disabled": false,
  "autoApprove": ["brave_web_search"]
}
```

**获取 API Key**：
1. 访问 https://brave.com/search/api/
2. 注册并获取 API Key
3. 免费额度：2000 次/月

**使用场景**：
- 搜索 Next.js 最新特性
- 查找 Supabase 最佳实践
- 火山引擎 AI API 文档

---

### 3. 可选安装（低优先级）⭐

#### E. PostgreSQL MCP
**用途**：直接执行 SQL、优化查询

```json
"postgres": {
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-postgres",
    "postgresql://postgres:[password]@db.rithloxzperfgiqyquch.supabase.co:5432/postgres"
  ],
  "disabled": false,
  "autoApprove": ["query"]
}
```

**注意**：
- 需要数据库密码
- 与 Supabase MCP 功能重叠
- 适合需要直接 SQL 操作的场景

#### F. Puppeteer MCP
**用途**：UI 自动化测试

```json
"puppeteer": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
  "disabled": false,
  "autoApprove": ["puppeteer_navigate"]
}
```

**使用场景**：
- 测试老年人 UI 交互流程
- 截图对比测试
- 性能测试

#### G. Sequential Thinking MCP
**用途**：复杂问题分析

```json
"sequential-thinking": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
  "disabled": false
}
```

**使用场景**：
- 分析复杂的 AI 对话流程
- 用药逻辑推理
- 紧急呼叫决策树

---

## 🎨 推荐 Kiro Powers

### 1. 数据库相关

| Power | 用途 | 优先级 |
|-------|------|--------|
| Supabase Power | 数据库管理增强 | ⭐⭐⭐ |
| Prisma Power | ORM 代码生成（如果使用 Prisma）| ⭐⭐ |

### 2. 前端开发

| Power | 用途 | 优先级 |
|-------|------|--------|
| React/Next.js Power | 组件开发辅助 | ⭐⭐⭐ |
| Tailwind CSS Power | 样式快速生成 | ⭐⭐⭐ |
| Accessibility Power | 老年人无障碍检查 | ⭐⭐⭐ |

### 3. AI/语音相关

| Power | 用途 | 优先级 |
|-------|------|--------|
| OpenAI Power | 测试其他 AI 模型 | ⭐ |
| Audio Processing Power | 语音处理（如果有）| ⭐⭐ |

### 4. 测试与质量

| Power | 用途 | 优先级 |
|-------|------|--------|
| Testing Power | 自动化测试生成 | ⭐⭐ |
| Code Review Power | 代码质量检查 | ⭐⭐ |

---

## 📝 配置步骤

### 方法 1：使用推荐配置文件

1. 复制推荐配置：
```bash
cp .kiro/settings/mcp-recommended.json .kiro/settings/mcp.json
```

2. 编辑配置文件，填入你的 API Keys：
```json
{
  "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx",
  "BRAVE_API_KEY": "BSA_xxxxxxxxxxxx"
}
```

3. 重启 Kiro 或重新连接 MCP Servers

### 方法 2：手动配置

1. 打开 `.kiro/settings/mcp.json`
2. 添加需要的 MCP Server 配置
3. 保存文件
4. 在 Kiro 中运行命令：`MCP: Reconnect All Servers`

### 方法 3：使用 Kiro 命令面板

1. 按 `Ctrl+Shift+P`（Windows）或 `Cmd+Shift+P`（Mac）
2. 搜索 `MCP`
3. 选择 `MCP: Configure Servers`
4. 在 UI 中添加/编辑配置

---

## 🎯 使用场景

### 场景 1：开发新功能

**需求**：添加"健康记录"页面

**使用工具**：
1. Shadcn MCP - 添加表单组件
2. Supabase MCP - 查询数据库表结构
3. Filesystem MCP - 生成页面文件

**示例对话**：
```
你：帮我创建健康记录页面，需要血压、血糖输入表单

Kiro：
1. 使用 Shadcn 添加 Form 组件
2. 查询 health_records 表结构
3. 生成 pages/health-records.tsx
```

---

### 场景 2：数据库操作

**需求**：查询最近 7 天的用药记录

**使用工具**：
1. Supabase MCP - 执行 SQL 查询
2. PostgreSQL MCP - 优化查询性能

**示例对话**：
```
你：查询张爷爷最近 7 天的用药记录

Kiro：
SELECT * FROM medication_records 
WHERE user_id = 'xxx' 
AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

### 场景 3：UI 测试

**需求**：测试老年人点击流程

**使用工具**：
1. Puppeteer MCP - 自动化测试
2. Filesystem MCP - 生成测试报告

**示例对话**：
```
你：测试老年人从首页到用药记录的点击流程

Kiro：
1. 启动浏览器
2. 点击"用药管家"
3. 验证页面加载
4. 截图保存
```

---

### 场景 4：技术调研

**需求**：了解 Next.js 16 新特性

**使用工具**：
1. Brave Search MCP - 搜索最新文档
2. GitHub MCP - 查看相关 Issues

**示例对话**：
```
你：Next.js 16 有哪些新特性适合我们项目？

Kiro：
1. 搜索 Next.js 16 文档
2. 总结新特性
3. 推荐适合老年人应用的特性
```

---

## 🔧 故障排查

### 问题 1：MCP Server 连接失败

**症状**：提示 "Failed to connect to MCP server"

**解决方案**：
1. 检查 `npx` 是否安装：`npx --version`
2. 检查网络连接
3. 查看 Kiro 日志：`View > Output > MCP`
4. 重新连接：`MCP: Reconnect All Servers`

### 问题 2：API Key 无效

**症状**：提示 "Invalid API key"

**解决方案**：
1. 检查 API Key 是否正确
2. 检查 API Key 权限
3. 重新生成 API Key
4. 更新配置文件

### 问题 3：Supabase MCP 无法执行 SQL

**症状**：提示 "Permission denied"

**解决方案**：
1. 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否正确
2. 确认使用的是 `service_role` 而非 `anon` key
3. 检查 Supabase 项目是否暂停

---

## 📚 相关文档

- [Kiro 配置指南](../03-tutorials/KIRO_CONFIGURATION_GUIDE.md)
- [Supabase MCP 设置](../03-tutorials/SUPABASE_MCP_SETUP.md)
- [快速开始](../03-tutorials/QUICK_START.md)

---

## 🔄 更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-02-25 | 初始版本，添加 8 个 MCP Server 推荐 |

---

*MCP & Powers 配置指南 · 桑梓智护项目*
