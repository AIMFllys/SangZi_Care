# 🔑 API Keys 获取完整指南

> **项目：** 桑梓智护 - 老年人智慧医养助手  
> **创建日期：** 2026-02-25  
> **用途：** 获取各种 MCP Servers 所需的 API Keys

---

## 📋 目录

1. [GitHub Personal Access Token](#1-github-personal-access-token)
2. [Brave Search API Key](#2-brave-search-api-key)
3. [Supabase Database Password](#3-supabase-database-password)
4. [Context7 API Key](#4-context7-api-key)
5. [安全建议](#安全建议)

---

## 1. GitHub Personal Access Token

### 🎯 用途
- 管理 GitHub 仓库
- 查看和创建 Issues
- 管理 Pull Requests
- 搜索代码

### 📝 获取步骤

#### 步骤 1：访问 GitHub Settings
1. 登录 GitHub：https://github.com
2. 点击右上角头像 → Settings
3. 左侧菜单滚动到底部 → Developer settings
4. 点击 Personal access tokens → Tokens (classic)

#### 步骤 2：生成新 Token
1. 点击 "Generate new token" → "Generate new token (classic)"
2. 填写信息：
   - **Note**（名称）：`Kiro MCP - 桑梓智护`
   - **Expiration**（过期时间）：建议选择 `90 days` 或 `No expiration`

#### 步骤 3：选择权限（Scopes）

**必选权限**：
- ✅ `repo` - Full control of private repositories
  - ✅ `repo:status` - Access commit status
  - ✅ `repo_deployment` - Access deployment status
  - ✅ `public_repo` - Access public repositories
  - ✅ `repo:invite` - Access repository invitations
  - ✅ `security_events` - Read and write security events

**推荐权限**：
- ✅ `read:org` - Read org and team membership, read org projects
- ✅ `read:user` - Read ALL user profile data
- ✅ `user:email` - Access user email addresses (read-only)

**可选权限**：
- ⬜ `workflow` - Update GitHub Action workflows（如果需要管理 CI/CD）
- ⬜ `write:packages` - Upload packages（如果需要发布包）

#### 步骤 4：生成并保存 Token
1. 点击页面底部的 "Generate token"
2. **立即复制 Token**（格式：`ghp_xxxxxxxxxxxxxxxxxxxx`）
3. ⚠️ **重要**：Token 只显示一次，请立即保存到安全的地方

#### 步骤 5：配置到 MCP

打开 `.kiro/settings/mcp.json`：

```json
"github": {
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxx"
  },
  "disabled": false
}
```

### ✅ 验证

在 Kiro 中输入：
```
列出我的 GitHub 仓库
```

---

## 2. Brave Search API Key

### 🎯 用途
- 搜索最新技术文档
- 查找代码示例
- 获取实时信息

### 📝 获取步骤

#### 步骤 1：访问 Brave Search API
1. 访问：https://brave.com/search/api/
2. 点击 "Get Started" 或 "Sign Up"

#### 步骤 2：注册账号
1. 可以使用以下方式注册：
   - GitHub 账号（推荐）
   - Google 账号
   - 邮箱注册

#### 步骤 3：创建 API Key
1. 登录后进入 Dashboard
2. 点击 "API Keys" 或 "Create API Key"
3. 填写信息：
   - **Name**：`Kiro MCP - 桑梓智护`
   - **Description**：`用于 Kiro AI 助手搜索技术文档`
4. 点击 "Create"

#### 步骤 4：复制 API Key
1. 复制生成的 API Key（格式：`BSA_xxxxxxxxxxxx`）
2. 保存到安全的地方

#### 步骤 5：了解免费额度
- **免费额度**：2,000 次查询/月
- **重置时间**：每月 1 号
- **超出限制**：需要升级到付费计划

#### 步骤 6：配置到 MCP

打开 `.kiro/settings/mcp.json`：

```json
"brave-search": {
  "env": {
    "BRAVE_API_KEY": "BSA_xxxxxxxxxxxxxxxxxxxx"
  },
  "disabled": false
}
```

### ✅ 验证

在 Kiro 中输入：
```
搜索 Next.js 16 新特性
```

### 💡 使用建议

1. **节省配额**：
   - 只在需要最新信息时使用
   - 优先使用本地文档和缓存

2. **监控用量**：
   - 定期查看 Dashboard
   - 接近限额时临时禁用

3. **优化查询**：
   - 使用精确的关键词
   - 避免重复查询

---

## 3. Supabase Database Password

### 🎯 用途
- 直接执行 SQL 查询
- 数据库性能优化
- 数据迁移

### 📝 获取步骤

#### 步骤 1：访问 Supabase Dashboard
1. 访问：https://supabase.com/dashboard
2. 登录你的账号
3. 选择项目：`rithloxzperfgiqyquch`

#### 步骤 2：查看数据库密码

**方法 1：从 Settings 获取**
1. 点击左侧菜单 "Settings"
2. 点击 "Database"
3. 找到 "Connection string" 部分
4. 点击 "Show" 查看密码
5. 复制密码

**方法 2：从 Connection Info 获取**
1. 点击左侧菜单 "Project Settings"
2. 点击 "Database"
3. 找到 "Connection info" 标签
4. 查看 "Password" 字段
5. 点击眼睛图标显示密码

#### 步骤 3：构建连接字符串

格式：
```
postgresql://postgres:[PASSWORD]@db.rithloxzperfgiqyquch.supabase.co:5432/postgres
```

将 `[PASSWORD]` 替换为实际密码。

#### 步骤 4：配置到 MCP

打开 `.kiro/settings/mcp.json`：

```json
"postgres": {
  "args": [
    "-y",
    "@modelcontextprotocol/server-postgres",
    "postgresql://postgres:YOUR_PASSWORD@db.rithloxzperfgiqyquch.supabase.co:5432/postgres"
  ],
  "disabled": false
}
```

### ✅ 验证

在 Kiro 中输入：
```
查询 users 表的前 10 条记录
```

### ⚠️ 注意事项

1. **安全性**：
   - 不要将密码提交到 Git
   - 不要在公开场合分享
   - 定期更换密码

2. **与 Supabase MCP 的区别**：
   - Supabase MCP：使用 Access Token，功能更丰富
   - PostgreSQL MCP：直接连接数据库，适合纯 SQL 操作
   - **推荐**：优先使用 Supabase MCP

---

## 4. Context7 API Key

### 🎯 用途
- 跨会话记忆
- 项目上下文管理
- 长期知识库

### 📝 获取步骤

#### 步骤 1：访问 Upstash
1. 访问：https://upstash.com/
2. 点击 "Sign Up" 或 "Get Started"

#### 步骤 2：注册账号
1. 可以使用以下方式注册：
   - GitHub 账号（推荐）
   - Google 账号
   - 邮箱注册

#### 步骤 3：创建 Context7 项目
1. 登录后进入 Console
2. 点击 "Create Database" 或 "New Project"
3. 选择 "Context7"
4. 填写信息：
   - **Name**：`kiro-mcp-桑梓智护`
   - **Region**：选择离你最近的区域（如 `ap-southeast-1`）
5. 点击 "Create"

#### 步骤 4：获取 API Key
1. 进入创建的项目
2. 找到 "API Keys" 或 "Credentials" 部分
3. 复制 API Key

#### 步骤 5：配置到 MCP

打开 `.kiro/settings/mcp.json`：

```json
"context7": {
  "args": [
    "-y",
    "@upstash/context7-mcp",
    "--api-key",
    "YOUR_CONTEXT7_API_KEY"
  ],
  "disabled": false
}
```

### ✅ 验证

在 Kiro 中输入：
```
记住：桑梓智护项目使用 Next.js 16 + Supabase
```

然后在新会话中输入：
```
桑梓智护项目使用什么技术栈？
```

### 💡 使用建议

1. **适合场景**：
   - 需要跨会话记忆的项目
   - 需要长期知识库的团队
   - 需要上下文管理的复杂项目

2. **不适合场景**：
   - 简单的单次对话
   - 不需要记忆的任务
   - 已有完善文档的项目

---

## 🔒 安全建议

### 1. 保护 API Keys

#### ✅ 应该做的：
- 将 API Keys 保存在 `.kiro/settings/mcp.json`（已在 `.gitignore` 中）
- 使用环境变量存储敏感信息
- 定期更换 API Keys
- 为不同项目使用不同的 Keys

#### ❌ 不应该做的：
- 将 API Keys 提交到 Git
- 在代码中硬编码 API Keys
- 在公开场合分享 API Keys
- 使用同一个 Key 在多个项目中

### 2. 使用 .gitignore

确保 `.gitignore` 包含：

```gitignore
# Kiro 配置（包含 API Keys）
.kiro/settings/mcp.json

# 环境变量
.env
.env.local
.env.*.local

# 备份文件
*.backup
*.bak
```

### 3. 使用环境变量（推荐）

**步骤 1：创建 `.env.local`**

```bash
# GitHub
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx

# Brave Search
BRAVE_API_KEY=BSA_xxxxxxxxxxxx

# Supabase
SUPABASE_DB_PASSWORD=your_password

# Context7
CONTEXT7_API_KEY=your_api_key
```

**步骤 2：在 MCP 配置中引用**

```json
"github": {
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
  }
}
```

**注意**：Kiro 目前可能不支持环境变量引用，这是未来的改进方向。

### 4. 权限最小化原则

- GitHub Token：只授予必要的权限
- Brave Search：使用免费额度，避免过度使用
- Supabase：使用 Service Role Key 时要特别小心
- Context7：限制访问范围

### 5. 定期审计

- **每月检查**：
  - 查看 API Keys 使用情况
  - 检查是否有异常访问
  - 更新即将过期的 Keys

- **每季度检查**：
  - 删除不再使用的 Keys
  - 更新所有 Keys
  - 审查权限设置

---

## 📊 API Keys 管理表

| API Key | 获取地址 | 免费额度 | 过期时间 | 状态 |
|---------|---------|---------|---------|------|
| GitHub Token | https://github.com/settings/tokens | 无限制 | 自定义 | ⏳ 待配置 |
| Brave Search | https://brave.com/search/api/ | 2000次/月 | 无 | ⏳ 待配置 |
| Supabase Password | Supabase Dashboard | 无限制 | 无 | ✅ 已有 |
| Context7 | https://upstash.com/ | 根据计划 | 无 | ⏳ 待配置 |

---

## 🔄 更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-02-25 | 初始版本，添加 4 个 API Keys 获取指南 |

---

## 📚 相关文档

- [MCP Servers 完整配置教程](MCP_COMPLETE_SETUP_GUIDE.md)
- [MCP & Powers 配置指南](../02-technical/MCP_POWERS_SETUP_GUIDE.md)
- [快速开始](QUICK_START.md)

---

*API Keys 获取指南 · 桑梓智护项目*
