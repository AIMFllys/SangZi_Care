# 🚀 MCP 快速参考卡片

> **一页纸快速查看所有 MCP 配置信息**

---

## 📊 配置状态一览

| MCP Server | 状态 | 优先级 | 需要配置 |
|-----------|------|--------|---------|
| Supabase | ✅ 已启用 | ⭐⭐⭐ | 无 |
| Shadcn | ✅ 已启用 | ⭐⭐⭐ | 无 |
| Filesystem | ✅ 已启用 | ⭐⭐⭐ | 无 |
| GitHub | ⏳ 待启用 | ⭐⭐ | [GitHub Token](#github-token) |
| Brave Search | ⏳ 待启用 | ⭐⭐ | [Brave API Key](#brave-api-key) |
| PostgreSQL | ⏳ 待启用 | ⭐ | [DB Password](#db-password) |
| Puppeteer | ⏳ 待启用 | ⭐ | 无 |
| Sequential Thinking | ⏳ 待启用 | ⭐ | 无 |
| Context7 | ⏳ 待启用 | ⭐ | [Context7 Key](#context7-key) |

---

## 🔑 API Keys 快速获取

### GitHub Token
1. 访问：https://github.com/settings/tokens
2. Generate new token (classic)
3. 权限：`repo` + `read:org`
4. 复制 Token（格式：`ghp_xxx`）

### Brave API Key
1. 访问：https://brave.com/search/api/
2. Sign Up → Create API Key
3. 复制 Key（格式：`BSA_xxx`）
4. 免费额度：2000次/月

### DB Password
1. Supabase Dashboard → Settings → Database
2. 查看 Connection string
3. 复制密码

### Context7 Key
1. 访问：https://upstash.com/
2. Create Database → Context7
3. 复制 API Key

---

## ⚡ 快速测试命令

| MCP Server | 测试命令 |
|-----------|---------|
| Supabase | `列出所有数据库表` |
| Shadcn | `列出所有可用的 shadcn 组件` |
| Filesystem | `列出 docs 目录下的所有文件` |
| GitHub | `列出我的 GitHub 仓库` |
| Brave Search | `搜索 Next.js 16 新特性` |
| PostgreSQL | `查询 users 表的前 10 条记录` |
| Puppeteer | `打开 https://example.com 并截图` |

---

## 🔧 常用操作

### 重新连接所有 MCP Servers
```
Ctrl+Shift+P → MCP: Reconnect All Servers
```

### 查看 MCP 日志
```
Ctrl+Shift+P → View: Toggle Output → 选择 "MCP"
```

### 查看 MCP 状态
```
侧边栏 → MCP Servers 面板
```

---

## 📁 配置文件位置

| 配置 | 路径 |
|------|------|
| 工作区配置 | `.kiro/settings/mcp.json` |
| 用户配置 | `~/.kiro/settings/mcp.json` |
| 推荐配置 | `.kiro/settings/mcp-recommended.json` |

---

## 🔒 安全提醒

- ✅ `.kiro/settings/mcp.json` 已在 `.gitignore`
- ❌ 不要将 API Keys 提交到 Git
- ❌ 不要在代码中硬编码 API Keys
- ✅ 定期更换 API Keys

---

## 📚 详细文档

| 文档 | 用途 |
|------|------|
| [MCP 完整配置教程](MCP_COMPLETE_SETUP_GUIDE.md) | 详细配置步骤 |
| [API Keys 获取指南](API_KEYS_GUIDE.md) | API Keys 获取详细步骤 |
| [配置检查清单](MCP_CONFIGURATION_CHECKLIST.md) | 验证配置状态 |

---

*MCP 快速参考 · 桑梓智护项目*
