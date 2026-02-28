# ⚡ MCP 工具优化指南

> **问题：** 当前启用了 64 个 MCP 工具，超过推荐的 50 个限制  
> **影响：** 导致 AI 工具选择性能下降和高 token 消耗  
> **目标：** 优化到 50 个以下，保持高效运行

---

## 🚨 当前问题

### 症状
```
You have 64 MCP tools enabled.
We recommend disabling servers or tools to keep this below 50.
```

### 影响
- ❌ AI 工具选择性能下降
- ❌ 高 token 消耗
- ❌ 上下文窗口被大量占用
- ❌ 响应速度变慢

---

## 🔍 问题诊断

### 检查启用的 MCP Servers

**工作区配置**：`.kiro/settings/mcp.json`
- ✅ Supabase（约 20 个工具）
- ✅ Shadcn（约 5 个工具）
- ✅ Filesystem（约 10 个工具）
- ⏸️ 其他服务器已禁用

**用户配置**：`~/.kiro/settings/mcp.json`
- ⚠️ 可能有其他全局启用的 MCP Servers

### 工具数量估算

| MCP Server | 工具数量（估算）|
|-----------|---------------|
| Supabase | ~20 |
| Shadcn | ~5 |
| Filesystem | ~10 |
| GitHub | ~15 |
| Brave Search | ~3 |
| PostgreSQL | ~8 |
| Puppeteer | ~10 |
| Sequential Thinking | ~5 |
| Context7 | ~5 |
| **其他未知服务器** | ~20+ |

---

## 💡 优化策略

### 策略 1：禁用不必要的 MCP Servers（推荐）

#### 优先保留（核心功能）
- ✅ **Supabase** - 数据库管理（必需）
- ✅ **Filesystem** - 文件管理（必需）
- ✅ **Shadcn** - UI 组件（推荐）

#### 按需启用（临时使用）
- ⏸️ **GitHub** - 仅在需要管理仓库时启用
- ⏸️ **Brave Search** - 仅在需要搜索时启用
- ⏸️ **Puppeteer** - 仅在需要测试时启用

#### 建议禁用（功能重叠）
- ❌ **PostgreSQL** - 与 Supabase 功能重叠
- ❌ **Sequential Thinking** - 非核心功能
- ❌ **Context7** - 非核心功能

---

### 策略 2：使用工具级别的禁用

如果某个 MCP Server 有很多工具，但你只需要其中几个，可以禁用不需要的工具。

**示例**：Supabase MCP 有 20+ 个工具，但你可能只需要：
- `list_tables`
- `execute_sql`
- `search_docs`

**配置方法**：
```json
"supabase": {
  "disabled": false,
  "autoApprove": ["list_tables", "execute_sql", "search_docs"],
  "disabledTools": [
    "create_project",
    "pause_project",
    "restore_project",
    "create_branch",
    "delete_branch",
    "merge_branch"
  ]
}
```

---

### 策略 3：检查用户级别配置

**步骤 1：打开用户配置**

Windows:
```
C:\Users\[你的用户名]\.kiro\settings\mcp.json
```

Mac/Linux:
```
~/.kiro/settings/mcp.json
```

**步骤 2：检查启用的服务器**

查看哪些服务器的 `disabled: false`

**步骤 3：禁用不需要的服务器**

将不需要的服务器改为 `disabled: true`

---

## 🎯 推荐配置方案

### 方案 A：最小化配置（约 35 个工具）

**仅保留核心功能**

```json
{
  "mcpServers": {
    "supabase": {
      "disabled": false,
      "autoApprove": ["list_tables", "execute_sql", "search_docs"]
    },
    "filesystem": {
      "disabled": false,
      "autoApprove": ["read_file", "list_directory", "search_files"]
    },
    "shadcn": {
      "disabled": false,
      "autoApprove": ["add", "list"]
    }
  }
}
```

**优点**：
- ✅ 工具数量最少
- ✅ 性能最佳
- ✅ Token 消耗最低

**缺点**：
- ❌ 功能有限
- ❌ 需要手动启用其他功能

---

### 方案 B：平衡配置（约 45 个工具）

**核心 + 常用功能**

```json
{
  "mcpServers": {
    "supabase": {
      "disabled": false,
      "autoApprove": ["list_tables", "execute_sql", "search_docs"]
    },
    "filesystem": {
      "disabled": false,
      "autoApprove": ["read_file", "list_directory", "search_files"]
    },
    "shadcn": {
      "disabled": false,
      "autoApprove": ["add", "list"]
    },
    "github": {
      "disabled": false,
      "autoApprove": ["list_issues", "get_issue"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

**优点**：
- ✅ 功能较全
- ✅ 性能良好
- ✅ 满足大部分需求

**缺点**：
- ⚠️ 需要配置 GitHub Token

---

### 方案 C：按需启用（推荐）

**平时使用最小化配置，需要时临时启用其他服务器**

**日常开发**：
```json
{
  "mcpServers": {
    "supabase": { "disabled": false },
    "filesystem": { "disabled": false },
    "shadcn": { "disabled": false }
  }
}
```

**需要搜索文档时**：
```json
{
  "mcpServers": {
    "brave-search": { "disabled": false }
  }
}
```

**需要 UI 测试时**：
```json
{
  "mcpServers": {
    "puppeteer": { "disabled": false }
  }
}
```

**优点**：
- ✅ 灵活性高
- ✅ 性能最优
- ✅ 按需使用

**缺点**：
- ⚠️ 需要手动切换

---

## 📝 操作步骤

### 步骤 1：查看当前启用的 MCP Servers

**方法 1：通过 Kiro UI**
1. 打开 Kiro 侧边栏
2. 找到 "MCP Servers" 面板
3. 查看哪些服务器显示 "Connected"

**方法 2：通过配置文件**
1. 打开 `.kiro/settings/mcp.json`
2. 查看 `disabled: false` 的服务器
3. 打开 `~/.kiro/settings/mcp.json`（如果存在）
4. 查看全局启用的服务器

---

### 步骤 2：禁用不需要的服务器

**工作区配置**（`.kiro/settings/mcp.json`）：

```json
{
  "mcpServers": {
    "supabase": {
      "disabled": false  // 保留
    },
    "filesystem": {
      "disabled": false  // 保留
    },
    "shadcn": {
      "disabled": false  // 保留
    },
    "github": {
      "disabled": true   // 暂时禁用
    },
    "brave-search": {
      "disabled": true   // 暂时禁用
    },
    "postgres": {
      "disabled": true   // 禁用（与 Supabase 重叠）
    },
    "puppeteer": {
      "disabled": true   // 暂时禁用
    },
    "sequential-thinking": {
      "disabled": true   // 禁用
    },
    "context7": {
      "disabled": true   // 禁用
    }
  }
}
```

**用户配置**（`~/.kiro/settings/mcp.json`）：

如果有其他全局启用的服务器，也将它们禁用。

---

### 步骤 3：重新连接 MCP Servers

1. 按 `Ctrl+Shift+P`（Windows）或 `Cmd+Shift+P`（Mac）
2. 输入 `MCP: Reconnect All Servers`
3. 等待连接完成

---

### 步骤 4：验证工具数量

1. 查看 Kiro 状态栏
2. 确认工具数量降到 50 以下
3. 如果仍然超过 50，继续禁用其他服务器

---

## 🔧 高级优化

### 使用 disabledTools 精细控制

如果某个 MCP Server 有很多工具，可以只禁用不需要的工具：

```json
"supabase": {
  "disabled": false,
  "disabledTools": [
    "create_project",
    "pause_project",
    "restore_project",
    "create_branch",
    "delete_branch",
    "merge_branch",
    "rebase_branch",
    "reset_branch",
    "deploy_edge_function",
    "list_edge_functions",
    "get_edge_function"
  ]
}
```

### 查看每个服务器的工具列表

在 Kiro 中输入：
```
列出 [服务器名称] 的所有可用工具
```

例如：
```
列出 Supabase MCP 的所有可用工具
```

---

## 📊 优化效果对比

| 配置方案 | 工具数量 | 性能 | 功能 | 推荐度 |
|---------|---------|------|------|--------|
| 当前配置 | 64 | ❌ 差 | ✅ 全 | ❌ |
| 方案 A（最小化）| 35 | ✅ 优 | ⚠️ 基础 | ⭐⭐⭐ |
| 方案 B（平衡）| 45 | ✅ 良 | ✅ 较全 | ⭐⭐⭐⭐ |
| 方案 C（按需）| 35-50 | ✅ 优 | ✅ 灵活 | ⭐⭐⭐⭐⭐ |

---

## 💡 最佳实践

### 1. 定期审查

**每周检查**：
- 查看启用的 MCP Servers
- 禁用不再使用的服务器
- 确保工具数量在 50 以下

### 2. 按需启用

**需要时启用**：
- 需要搜索文档 → 启用 Brave Search
- 需要管理仓库 → 启用 GitHub
- 需要 UI 测试 → 启用 Puppeteer

**用完后禁用**：
- 完成任务后立即禁用
- 保持配置简洁

### 3. 使用 autoApprove

只自动批准常用的工具：
```json
"autoApprove": ["list_tables", "execute_sql", "read_file"]
```

### 4. 避免功能重叠

- ❌ 同时启用 Supabase 和 PostgreSQL
- ❌ 同时启用多个搜索服务
- ✅ 选择最适合的一个

---

## 🎯 推荐行动计划

### 立即行动（今天）

1. ✅ 打开 `.kiro/settings/mcp.json`
2. ✅ 确认只启用 3 个核心服务器：
   - Supabase
   - Filesystem
   - Shadcn
3. ✅ 禁用所有其他服务器
4. ✅ 重新连接 MCP Servers
5. ✅ 验证工具数量降到 50 以下

### 短期行动（本周）

6. ⏳ 检查用户级别配置（`~/.kiro/settings/mcp.json`）
7. ⏳ 禁用用户级别的不需要的服务器
8. ⏳ 根据需要配置 GitHub MCP（但保持禁用）
9. ⏳ 根据需要配置 Brave Search MCP（但保持禁用）

### 长期行动（持续）

10. ⏳ 建立按需启用的习惯
11. ⏳ 定期审查 MCP 配置
12. ⏳ 优化 autoApprove 列表

---

## 📚 相关文档

- [MCP 完整配置教程](MCP_COMPLETE_SETUP_GUIDE.md)
- [MCP 配置检查清单](MCP_CONFIGURATION_CHECKLIST.md)
- [MCP 快速参考](MCP_QUICK_REFERENCE.md)

---

## 🔄 更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-02-25 | 初始版本，针对 64 个工具的优化指南 |

---

*MCP 工具优化指南 · 桑梓智护项目*
