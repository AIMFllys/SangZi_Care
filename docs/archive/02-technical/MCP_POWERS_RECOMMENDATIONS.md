# 🚀 桑梓智护 · MCP Servers 和 Powers 推荐配置

> **基于项目需求的深度分析**  
> **创建日期：** 2026-02-25

---

## 📊 项目技术需求分析

### 核心技术栈
- **前端**: Next.js 16.x + TypeScript (静态导出 → WebView APK)
- **后端**: Python + FastAPI
- **数据库**: Supabase (PostgreSQL)
- **AI**: 火山引擎豆包 (ASR/TTS/LLM)
- **存储**: Supabase Storage (语音文件、头像等)

### 关键功能模块
1. 🎙️ **语音助手** - 实时语音识别、语音合成、AI对话
2. 💊 **用药管家** - 定时提醒、数据库操作
3. 💬 **捂话功能** - 语音留言、文件存储
4. ❤️ **健康记录** - 数据可视化、趋势分析
5. 🆘 **紧急呼叫** - 实时通知、地理位置
6. 📻 **健康广播** - AI内容生成、音频播放

---

## ✅ 必装 MCP Servers（优先级 P0）

### 1. Supabase MCP Server ⭐⭐⭐⭐⭐

**状态**: ✅ 已配置

**用途**:
- 数据库表管理（users, medication_plans, health_records等）
- 执行 SQL 查询和迁移
- 管理 Storage（语音文件、头像）
- 设置 RLS 策略（数据安全）
- 生成 TypeScript 类型定义

**为什么必装**:
- 你的整个数据层都在 Supabase
- 可以直接通过 AI 创建表、查询数据
- 避免手动写 SQL 和配置

**配置文件**: `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--access-token", "YOUR_TOKEN"],
      "env": {
        "SUPABASE_URL": "https://rithloxzperfgiqyquch.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_KEY"
      }
    }
  }
}
```

---

### 2. Filesystem MCP Server ⭐⭐⭐⭐⭐

**用途**:
- 管理项目文件结构
- 创建/读取/修改代码文件
- 批量操作文件

**为什么必装**:
- 你的项目有 ~20 个页面、多个组件
- 需要快速搭建文件结构
- 批量创建组件、样式文件

**安装命令**:
```bash
npm install -g @modelcontextprotocol/server-filesystem
```

**配置**:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "--allowed-directories",
        "D:/project/old_and_new/app"
      ]
    }
  }
}
```

---

### 3. Git MCP Server ⭐⭐⭐⭐

**用途**:
- 版本控制操作
- 查看提交历史
- 创建分支、合并代码
- 查看文件变更

**为什么推荐**:
- 多人协作开发
- 需要频繁提交代码
- AI 可以帮你写 commit message

**安装命令**:
```bash
npm install -g @modelcontextprotocol/server-git
```

**配置**:
```json
{
  "mcpServers": {
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-git",
        "--repository",
        "D:/project/old_and_new/app"
      ]
    }
  }
}
```

---

## 🎯 推荐 MCP Servers（优先级 P1）

### 4. Fetch MCP Server ⭐⭐⭐⭐

**用途**:
- 调用外部 API（火山引擎豆包）
- 测试 FastAPI 后端接口
- 获取天气数据（首页显示）

**为什么推荐**:
- 你需要集成火山引擎 AI API
- 需要测试后端 API
- 首页需要显示天气信息

**安装命令**:
```bash
npm install -g @modelcontextprotocol/server-fetch
```

**配置**:
```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```

---

### 5. Time MCP Server ⭐⭐⭐

**用途**:
- 获取当前时间
- 时区转换
- 定时任务调度

**为什么推荐**:
- 用药提醒需要精确时间
- 首页显示"早上好/下午好"
- 健康日报定时生成

**安装命令**:
```bash
npm install -g @modelcontextprotocol/server-time
```

**配置**:
```json
{
  "mcpServers": {
    "time": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-time"]
    }
  }
}
```

---

### 6. Memory MCP Server ⭐⭐⭐

**用途**:
- 跨会话记忆上下文
- 记住项目配置和决策
- 避免重复解释需求

**为什么推荐**:
- 项目复杂，需要记住设计决策
- 避免每次都重新解释需求
- 提高开发效率

**安装命令**:
```bash
npm install -g @modelcontextprotocol/server-memory
```

**配置**:
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

---

## 🔧 可选 MCP Servers（优先级 P2）

### 7. Puppeteer MCP Server ⭐⭐⭐

**用途**:
- E2E 测试
- 截图验证 UI
- 自动化测试流程

**何时需要**:
- Phase 1 完成后，开始测试阶段
- 需要验证适老化 UI 效果
- 自动化测试用药提醒流程

**安装命令**:
```bash
npm install -g @modelcontextprotocol/server-puppeteer
```

---

### 8. Brave Search MCP Server ⭐⭐

**用途**:
- 搜索技术文档
- 查找最新的库版本
- 解决技术问题

**何时需要**:
- 遇到技术难题时
- 需要查找最新的 API 文档
- 学习新技术

**安装命令**:
```bash
npm install -g @modelcontextprotocol/server-brave-search
```

---

## 🎨 推荐 Powers（Kiro 扩展）

### 当前可用 Powers

根据你的 `.agent/mcp_config.json`，你已经配置了：

1. **Pencil** - UI 设计工具（已启用）
2. **Supabase** - 数据库管理（已启用）
3. **Context7** - 上下文管理（已禁用）
4. **Shadcn** - UI 组件库（已禁用）

### 建议启用的 Powers

#### 1. Shadcn Power ⭐⭐⭐⭐

**用途**:
- 快速添加 UI 组件
- 适老化组件库基础
- 加速前端开发

**为什么推荐**:
- 你需要大量 UI 组件（BigButton, BigCard等）
- Shadcn 组件可定制性强
- 适合适老化改造

**启用方法**:
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"],
      "disabled": false  // ← 改为 false
    }
  }
}
```

---

#### 2. Context7 Power ⭐⭐⭐

**用途**:
- 智能上下文管理
- 代码片段存储
- 项目知识库

**为什么推荐**:
- 项目复杂，需要管理大量上下文
- 可以存储常用代码片段
- 提高开发效率

**启用方法**:
1. 获取 Upstash API Key: https://upstash.com/
2. 更新配置:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp",
        "--api-key",
        "YOUR_UPSTASH_API_KEY"
      ],
      "disabled": false  // ← 改为 false
    }
  }
}
```

---

## 📦 完整推荐配置

### 最终 `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--access-token",
        "YOUR_SUPABASE_ACCESS_TOKEN"
      ],
      "env": {
        "SUPABASE_URL": "https://rithloxzperfgiqyquch.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY"
      },
      "disabled": false,
      "autoApprove": []
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "--allowed-directories",
        "D:/project/old_and_new/app"
      ],
      "disabled": false,
      "autoApprove": ["read_file", "list_directory"]
    },
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-git",
        "--repository",
        "D:/project/old_and_new/app"
      ],
      "disabled": false,
      "autoApprove": ["git_status", "git_log"]
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "disabled": false,
      "autoApprove": []
    },
    "time": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-time"],
      "disabled": false,
      "autoApprove": ["get_current_time"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "disabled": false,
      "autoApprove": []
    },
    "pencil": {
      "command": "npx",
      "args": ["-y", "@pencil-ai/mcp-server"],
      "disabled": false,
      "autoApprove": []
    },
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"],
      "disabled": false,
      "autoApprove": []
    },
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp",
        "--api-key",
        "YOUR_UPSTASH_API_KEY"
      ],
      "disabled": true
    }
  }
}
```

---

## 🎯 分阶段安装建议

### Phase 1: MVP 开发（立即安装）

✅ **必装**:
1. Supabase MCP Server（已安装）
2. Filesystem MCP Server
3. Git MCP Server

⚠️ **推荐**:
4. Fetch MCP Server
5. Time MCP Server

### Phase 2: 功能扩展（2周后）

6. Memory MCP Server
7. Shadcn Power（启用）
8. Context7 Power（启用）

### Phase 3: 测试与优化（4周后）

9. Puppeteer MCP Server
10. Brave Search MCP Server

---

## 🚀 快速安装脚本

### Windows PowerShell

```powershell
# 安装所有推荐的 MCP Servers
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-git
npm install -g @modelcontextprotocol/server-fetch
npm install -g @modelcontextprotocol/server-time
npm install -g @modelcontextprotocol/server-memory

# 验证安装
npx @modelcontextprotocol/server-filesystem --version
npx @modelcontextprotocol/server-git --version
```

---

## 📊 功能映射表

| 项目功能 | 需要的 MCP Server | 优先级 |
|---------|------------------|--------|
| 数据库表创建 | Supabase | P0 |
| 文件结构搭建 | Filesystem | P0 |
| 版本控制 | Git | P0 |
| API 测试 | Fetch | P1 |
| 定时提醒 | Time | P1 |
| 上下文管理 | Memory | P1 |
| UI 组件 | Shadcn | P1 |
| E2E 测试 | Puppeteer | P2 |
| 技术搜索 | Brave Search | P2 |

---

## ⚠️ 注意事项

### 1. 权限配置

**Filesystem MCP Server**:
- 只允许访问项目目录
- 不要给整个磁盘权限

**Git MCP Server**:
- 只允许访问项目仓库
- 敏感操作需要手动确认

### 2. 自动批准设置

**建议自动批准的操作**:
```json
{
  "autoApprove": [
    "read_file",
    "list_directory",
    "git_status",
    "git_log",
    "get_current_time"
  ]
}
```

**不建议自动批准的操作**:
- `write_file` - 写文件
- `delete_file` - 删除文件
- `git_commit` - 提交代码
- `execute_sql` - 执行 SQL

### 3. 性能优化

- 不要同时启用太多 MCP Servers（建议 ≤ 8 个）
- 暂时不用的可以设置 `disabled: true`
- 定期清理不用的 MCP Servers

---

## 🔗 相关资源

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [Supabase MCP 文档](https://supabase.com/docs/guides/getting-started/mcp)
- [Kiro Powers 文档](https://docs.kiro.ai/powers)
- [项目配置指南](KIRO_CONFIGURATION_GUIDE.md)

---

## 📝 下一步行动

### 立即执行

1. ✅ 配置 Supabase Access Token（已完成）
2. ⬜ 安装 Filesystem MCP Server
3. ⬜ 安装 Git MCP Server
4. ⬜ 安装 Fetch MCP Server
5. ⬜ 安装 Time MCP Server
6. ⬜ 重启 Kiro

### 本周内完成

7. ⬜ 安装 Memory MCP Server
8. ⬜ 启用 Shadcn Power
9. ⬜ 测试所有 MCP Servers

### 2周后

10. ⬜ 获取 Upstash API Key
11. ⬜ 启用 Context7 Power
12. ⬜ 安装 Puppeteer MCP Server

---

*本文档基于项目需求深度分析，提供最适合的 MCP 和 Powers 配置建议。*
