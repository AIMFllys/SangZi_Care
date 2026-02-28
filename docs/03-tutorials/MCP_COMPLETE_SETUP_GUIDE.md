# 🚀 MCP Servers 完整配置教程

> **项目：** 桑梓智护 - 老年人智慧医养助手  
> **创建日期：** 2026-02-25  
> **难度：** ⭐⭐ 中级  
> **预计时间：** 30-60 分钟

---

## 📋 目录

1. [配置前准备](#配置前准备)
2. [必装 MCP Servers](#必装-mcp-servers)
3. [推荐 MCP Servers](#推荐-mcp-servers)
4. [可选 MCP Servers](#可选-mcp-servers)
5. [验证配置](#验证配置)
6. [常见问题](#常见问题)

---

## ✅ 配置前准备

### 1. 检查环境

确保已安装以下工具：

```bash
# 检查 Node.js（需要 >= 18.0.0）
node --version

# 检查 npm
npm --version

# 检查 npx
npx --version
```

### 2. 备份现有配置

```bash
# 备份当前配置
cp .kiro/settings/mcp.json .kiro/settings/mcp.json.backup
```

### 3. 了解配置文件位置

| 配置级别 | 文件路径 | 说明 |
|---------|---------|------|
| 工作区配置 | `.kiro/settings/mcp.json` | 当前项目专用 |
| 用户配置 | `~/.kiro/settings/mcp.json` | 全局配置 |

**建议**：在工作区配置文件中配置项目专用的 MCP Servers。

---

## 🔥 必装 MCP Servers

### 1. Supabase MCP ✅ 已配置

**用途**：数据库管理、表查询、SQL 执行

**状态**：✅ 已正确配置并启用

**功能**：
- 搜索 Supabase 文档
- 列出数据库表
- 执行 SQL 查询
- 查看项目信息
- 管理 Edge Functions

**无需额外操作**，已经可以使用！

---

### 2. Shadcn MCP ✅ 已启用

**用途**：快速添加 UI 组件

**状态**：✅ 已启用

**功能**：
- 添加 shadcn/ui 组件
- 列出可用组件
- 查看组件示例

**测试命令**：
```
在 Kiro 中输入：列出所有可用的 shadcn 组件
```

---

### 3. Filesystem MCP ✅ 已启用

**用途**：文件管理和代码生成

**状态**：✅ 已启用

**功能**：
- 读取文件内容
- 列出目录结构
- 搜索文件
- 创建/修改文件

**测试命令**：
```
在 Kiro 中输入：列出 docs 目录下的所有文件
```

---

## 🌟 推荐 MCP Servers

### 4. GitHub MCP ⏳ 待配置

**用途**：版本控制和 Issue 管理

**状态**：⏳ 已添加但禁用（需要 API Token）


#### 📝 配置步骤

**步骤 1：获取 GitHub Personal Access Token**

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置 Token 名称：`Kiro MCP - 桑梓智护`
4. 设置过期时间：建议选择 90 天或更长
5. 选择权限（Scopes）：
   - ✅ `repo` - 完整的仓库访问权限
   - ✅ `read:org` - 读取组织信息
   - ✅ `read:user` - 读取用户信息
6. 点击 "Generate token"
7. **立即复制 Token**（只显示一次！）

**步骤 2：配置 MCP**

打开 `.kiro/settings/mcp.json`，找到 `github` 配置：

```json
"github": {
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxx"  // 粘贴你的 Token
  },
  "disabled": false  // 改为 false 启用
}
```

**步骤 3：重新连接**

在 Kiro 中：
1. 按 `Ctrl+Shift+P`（Windows）或 `Cmd+Shift+P`（Mac）
2. 输入 `MCP: Reconnect All Servers`
3. 等待连接成功

**步骤 4：测试**

```
在 Kiro 中输入：列出我的 GitHub 仓库
```

---

### 5. Brave Search MCP ⏳ 待配置

**用途**：搜索最新技术文档

**状态**：⏳ 已添加但禁用（需要 API Key）

#### 📝 配置步骤

**步骤 1：获取 Brave Search API Key**

1. 访问 https://brave.com/search/api/
2. 点击 "Get Started" 或 "Sign Up"
3. 注册账号（可以使用 GitHub 登录）
4. 进入 Dashboard
5. 点击 "Create API Key"
6. 复制 API Key（格式：`BSA_xxxxxxxxxxxx`）

**免费额度**：
- 2,000 次查询/月
- 足够个人开发使用

**步骤 2：配置 MCP**

打开 `.kiro/settings/mcp.json`，找到 `brave-search` 配置：

```json
"brave-search": {
  "env": {
    "BRAVE_API_KEY": "BSA_xxxxxxxxxxxxxxxxxxxx"  // 粘贴你的 API Key
  },
  "disabled": false  // 改为 false 启用
}
```

**步骤 3：重新连接**

在 Kiro 中运行：`MCP: Reconnect All Servers`

**步骤 4：测试**

```
在 Kiro 中输入：搜索 Next.js 16 新特性
```

---

## 🎯 可选 MCP Servers

### 6. PostgreSQL MCP ⏳ 待配置

**用途**：直接执行 SQL、优化查询

**状态**：⏳ 已添加但禁用（需要数据库密码）

**注意**：与 Supabase MCP 功能重叠，仅在需要直接 SQL 操作时启用。

#### 📝 配置步骤

**步骤 1：获取数据库密码**

1. 访问 Supabase Dashboard：https://supabase.com/dashboard
2. 选择项目：`rithloxzperfgiqyquch`
3. 进入 Settings → Database
4. 找到 "Connection string" 或 "Database password"
5. 复制密码

**步骤 2：配置 MCP**

打开 `.kiro/settings/mcp.json`，找到 `postgres` 配置：

```json
"postgres": {
  "args": [
    "-y",
    "@modelcontextprotocol/server-postgres",
    "postgresql://postgres:YOUR_PASSWORD@db.rithloxzperfgiqyquch.supabase.co:5432/postgres"
  ],
  "disabled": false  // 改为 false 启用
}
```

将 `YOUR_PASSWORD` 替换为实际密码。

**步骤 3：测试**

```
在 Kiro 中输入：查询 users 表的前 10 条记录
```

---

### 7. Puppeteer MCP ⏳ 待配置

**用途**：UI 自动化测试

**状态**：⏳ 已添加但禁用

**使用场景**：
- 测试老年人 UI 交互流程
- 截图对比测试
- 性能测试

#### 📝 配置步骤

**步骤 1：启用 MCP**

打开 `.kiro/settings/mcp.json`，找到 `puppeteer` 配置：

```json
"puppeteer": {
  "disabled": false  // 改为 false 启用
}
```

**步骤 2：首次使用会自动下载 Chromium**

第一次使用时，npx 会自动下载 Chromium 浏览器（约 150MB），请耐心等待。

**步骤 3：测试**

```
在 Kiro 中输入：打开 https://example.com 并截图
```

---

### 8. Sequential Thinking MCP ⏳ 待配置

**用途**：复杂问题分析

**状态**：⏳ 已添加但禁用

**使用场景**：
- 分析复杂的 AI 对话流程
- 用药逻辑推理
- 紧急呼叫决策树

#### 📝 配置步骤

**步骤 1：启用 MCP**

打开 `.kiro/settings/mcp.json`，找到 `sequential-thinking` 配置：

```json
"sequential-thinking": {
  "disabled": false  // 改为 false 启用
}
```

**步骤 2：测试**

```
在 Kiro 中输入：分析老年人用药提醒的完整流程
```

---

### 9. Context7 MCP ⏳ 待配置

**用途**：上下文管理和记忆

**状态**：⏳ 已添加但禁用（需要 API Key）

**使用场景**：
- 跨会话记忆
- 项目上下文管理
- 长期知识库

#### 📝 配置步骤

**步骤 1：获取 API Key**

1. 访问 https://upstash.com/
2. 注册账号
3. 创建 Context7 项目
4. 获取 API Key

**步骤 2：配置 MCP**

打开 `.kiro/settings/mcp.json`，找到 `context7` 配置：

```json
"context7": {
  "args": [
    "-y",
    "@upstash/context7-mcp",
    "--api-key",
    "YOUR_CONTEXT7_API_KEY"  // 粘贴你的 API Key
  ],
  "disabled": false  // 改为 false 启用
}
```

---

## ✅ 验证配置

### 方法 1：查看 MCP 状态

在 Kiro 中：
1. 打开侧边栏
2. 找到 "MCP Servers" 面板
3. 查看各个 Server 的连接状态

### 方法 2：测试命令

在 Kiro 中依次输入以下命令：

```
1. 列出所有数据库表（测试 Supabase MCP）
2. 列出可用的 shadcn 组件（测试 Shadcn MCP）
3. 列出 docs 目录（测试 Filesystem MCP）
4. 列出我的 GitHub 仓库（测试 GitHub MCP）
5. 搜索 Next.js 文档（测试 Brave Search MCP）
```

### 方法 3：查看日志

在 Kiro 中：
1. 按 `Ctrl+Shift+P`
2. 输入 `View: Toggle Output`
3. 选择 "MCP" 频道
4. 查看连接日志

---

## 🔧 常见问题

### 问题 1：MCP Server 连接失败

**症状**：
```
Failed to connect to MCP server: supabase
```

**解决方案**：

1. 检查 npx 是否安装：
```bash
npx --version
```

2. 检查网络连接

3. 手动测试 MCP Server：
```bash
npx -y @supabase/mcp-server-supabase --access-token YOUR_TOKEN
```

4. 查看详细日志：
   - 打开 Kiro Output 面板
   - 选择 "MCP" 频道
   - 查看错误信息

5. 重新连接：
   - `Ctrl+Shift+P` → `MCP: Reconnect All Servers`

---

### 问题 2：GitHub Token 无效

**症状**：
```
Authentication failed: Invalid token
```

**解决方案**：

1. 检查 Token 是否正确复制（没有多余空格）

2. 检查 Token 权限：
   - 必须包含 `repo` 权限
   - 必须包含 `read:org` 权限

3. 检查 Token 是否过期：
   - 访问 https://github.com/settings/tokens
   - 查看 Token 状态

4. 重新生成 Token：
   - 删除旧 Token
   - 按照教程重新生成

---

### 问题 3：Brave Search 配额用完

**症状**：
```
API quota exceeded
```

**解决方案**：

1. 查看当前用量：
   - 访问 Brave Search Dashboard
   - 查看 "Usage" 页面

2. 等待下月重置（每月 1 号）

3. 升级到付费计划（可选）

4. 临时禁用 Brave Search MCP：
```json
"brave-search": {
  "disabled": true
}
```

---

### 问题 4：Puppeteer 下载 Chromium 失败

**症状**：
```
Failed to download Chromium
```

**解决方案**：

1. 检查网络连接（可能需要代理）

2. 手动下载 Chromium：
```bash
npx puppeteer browsers install chrome
```

3. 设置代理（如果需要）：
```bash
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

4. 使用系统 Chrome（高级）：
```json
"puppeteer": {
  "args": [
    "-y",
    "@modelcontextprotocol/server-puppeteer",
    "--executable-path=/path/to/chrome"
  ]
}
```

---

### 问题 5：PostgreSQL 连接超时

**症状**：
```
Connection timeout
```

**解决方案**：

1. 检查数据库密码是否正确

2. 检查 Supabase 项目是否暂停：
   - 访问 Supabase Dashboard
   - 查看项目状态
   - 如果暂停，点击 "Resume"

3. 检查网络连接

4. 使用 Supabase MCP 代替（推荐）

---

### 问题 6：autoApprove 不生效

**症状**：每次都需要手动批准工具调用

**解决方案**：

1. 检查 `autoApprove` 配置是否正确：
```json
"autoApprove": ["read_file", "list_directory"]
```

2. 重新连接 MCP Servers

3. 重启 Kiro

4. 如果仍不生效，可能是 Kiro 版本问题，请更新到最新版本

---

## 📊 配置总结

### 当前配置状态

| MCP Server | 状态 | 优先级 | 需要配置 |
|-----------|------|--------|---------|
| Supabase | ✅ 已启用 | ⭐⭐⭐ 必装 | 无 |
| Shadcn | ✅ 已启用 | ⭐⭐⭐ 必装 | 无 |
| Filesystem | ✅ 已启用 | ⭐⭐⭐ 必装 | 无 |
| GitHub | ⏳ 待启用 | ⭐⭐ 推荐 | GitHub Token |
| Brave Search | ⏳ 待启用 | ⭐⭐ 推荐 | Brave API Key |
| PostgreSQL | ⏳ 待启用 | ⭐ 可选 | 数据库密码 |
| Puppeteer | ⏳ 待启用 | ⭐ 可选 | 无 |
| Sequential Thinking | ⏳ 待启用 | ⭐ 可选 | 无 |
| Context7 | ⏳ 待启用 | ⭐ 可选 | Context7 API Key |

### 推荐配置顺序

1. ✅ **已完成**：Supabase、Shadcn、Filesystem
2. **下一步**：GitHub MCP（提升版本控制效率）
3. **然后**：Brave Search MCP（搜索最新文档）
4. **最后**：根据需要启用其他 MCP Servers

---

## 🎯 使用场景示例

### 场景 1：开发新功能

**需求**：添加"健康记录"页面

**使用的 MCP Servers**：
1. Supabase MCP - 查询数据库表结构
2. Shadcn MCP - 添加表单组件
3. Filesystem MCP - 生成页面文件

**示例对话**：
```
你：帮我创建健康记录页面，需要血压、血糖输入表单

Kiro：
1. [Supabase MCP] 查询 health_records 表结构
2. [Shadcn MCP] 添加 Form、Input 组件
3. [Filesystem MCP] 创建 pages/health-records.tsx
4. 生成完整代码
```

---

### 场景 2：技术调研

**需求**：了解 Next.js 16 新特性

**使用的 MCP Servers**：
1. Brave Search MCP - 搜索最新文档
2. GitHub MCP - 查看相关 Issues

**示例对话**：
```
你：Next.js 16 有哪些新特性适合我们项目？

Kiro：
1. [Brave Search] 搜索 Next.js 16 文档
2. [GitHub] 查看 Next.js 仓库的 Issues
3. 总结新特性
4. 推荐适合老年人应用的特性
```

---

### 场景 3：数据库操作

**需求**：查询最近 7 天的用药记录

**使用的 MCP Servers**：
1. Supabase MCP - 执行 SQL 查询

**示例对话**：
```
你：查询张爷爷最近 7 天的用药记录

Kiro：
[Supabase MCP] 执行查询：
SELECT * FROM medication_records 
WHERE user_id = 'xxx' 
AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

### 场景 4：UI 测试

**需求**：测试老年人点击流程

**使用的 MCP Servers**：
1. Puppeteer MCP - 自动化测试
2. Filesystem MCP - 保存截图

**示例对话**：
```
你：测试老年人从首页到用药记录的点击流程

Kiro：
1. [Puppeteer] 启动浏览器
2. [Puppeteer] 点击"用药管家"
3. [Puppeteer] 验证页面加载
4. [Puppeteer] 截图
5. [Filesystem] 保存截图到 tests/screenshots/
```

---

## 📚 相关文档

- [MCP & Powers 配置指南](../02-technical/MCP_POWERS_SETUP_GUIDE.md)
- [Supabase MCP 设置](SUPABASE_MCP_SETUP.md)
- [快速开始](QUICK_START.md)
- [Kiro 配置指南](KIRO_CONFIGURATION_GUIDE.md)

---

## 🔄 更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-02-25 | 初始版本，完整配置 9 个 MCP Servers |

---

## 💡 小贴士

1. **优先启用必装的 MCP Servers**（Supabase、Shadcn、Filesystem）
2. **根据需要逐步启用其他 MCP Servers**，避免一次性配置太多
3. **定期检查 API 配额**（GitHub、Brave Search）
4. **使用 autoApprove 提升效率**，但要注意安全性
5. **遇到问题先查看日志**，大部分问题都能从日志中找到原因

---

*MCP Servers 完整配置教程 · 桑梓智护项目*
