# ✅ MCP 配置检查清单

> **项目：** 桑梓智护 - 老年人智慧医养助手  
> **创建日期：** 2026-02-25  
> **用途：** 快速检查 MCP 配置状态

---

## 📋 配置前检查

### 环境检查

- [ ] Node.js 已安装（>= 18.0.0）
  ```bash
  node --version
  ```

- [ ] npm 已安装
  ```bash
  npm --version
  ```

- [ ] npx 可用
  ```bash
  npx --version
  ```

- [ ] 网络连接正常
  ```bash
  ping google.com
  ```

### 文件检查

- [ ] `.kiro/settings/mcp.json` 文件存在
- [ ] `.gitignore` 包含 `.kiro/settings/mcp.json`
- [ ] 已备份现有配置（如果有）

---

## 🔥 必装 MCP Servers

### 1. Supabase MCP

- [x] 已添加到配置文件
- [x] Access Token 已配置
- [x] Service Role Key 已配置
- [x] `disabled: false`
- [x] 已测试连接

**测试命令**：
```
在 Kiro 中输入：列出所有数据库表
```

**预期结果**：
```
✅ 返回表列表：users, health_records, medication_plans 等
```

---

### 2. Shadcn MCP

- [x] 已添加到配置文件
- [x] `disabled: false`
- [x] 已测试连接

**测试命令**：
```
在 Kiro 中输入：列出所有可用的 shadcn 组件
```

**预期结果**：
```
✅ 返回组件列表：button, form, input, card 等
```

---

### 3. Filesystem MCP

- [x] 已添加到配置文件
- [x] `disabled: false`
- [x] 已测试连接

**测试命令**：
```
在 Kiro 中输入：列出 docs 目录下的所有文件
```

**预期结果**：
```
✅ 返回文件列表：README.md, 01-planning/, 02-technical/ 等
```

---

## 🌟 推荐 MCP Servers

### 4. GitHub MCP

- [ ] 已添加到配置文件
- [ ] GitHub Personal Access Token 已获取
- [ ] Token 已配置到 `env.GITHUB_PERSONAL_ACCESS_TOKEN`
- [ ] Token 权限包含 `repo` 和 `read:org`
- [ ] `disabled: false`
- [ ] 已测试连接

**获取 Token**：
- 访问：https://github.com/settings/tokens
- 参考：[API Keys 获取指南](API_KEYS_GUIDE.md#1-github-personal-access-token)

**测试命令**：
```
在 Kiro 中输入：列出我的 GitHub 仓库
```

**预期结果**：
```
✅ 返回仓库列表
```

---

### 5. Brave Search MCP

- [ ] 已添加到配置文件
- [ ] Brave Search API Key 已获取
- [ ] API Key 已配置到 `env.BRAVE_API_KEY`
- [ ] 了解免费额度（2000次/月）
- [ ] `disabled: false`
- [ ] 已测试连接

**获取 API Key**：
- 访问：https://brave.com/search/api/
- 参考：[API Keys 获取指南](API_KEYS_GUIDE.md#2-brave-search-api-key)

**测试命令**：
```
在 Kiro 中输入：搜索 Next.js 16 新特性
```

**预期结果**：
```
✅ 返回搜索结果
```

---

## 🎯 可选 MCP Servers

### 6. PostgreSQL MCP

- [ ] 已添加到配置文件
- [ ] Supabase 数据库密码已获取
- [ ] 连接字符串已配置
- [ ] `disabled: false`（如果需要）
- [ ] 已测试连接

**获取密码**：
- 访问：Supabase Dashboard → Settings → Database
- 参考：[API Keys 获取指南](API_KEYS_GUIDE.md#3-supabase-database-password)

**测试命令**：
```
在 Kiro 中输入：查询 users 表的前 10 条记录
```

**预期结果**：
```
✅ 返回查询结果
```

**注意**：
- ⚠️ 与 Supabase MCP 功能重叠
- ⚠️ 仅在需要直接 SQL 操作时启用

---

### 7. Puppeteer MCP

- [ ] 已添加到配置文件
- [ ] `disabled: false`（如果需要）
- [ ] Chromium 已下载（首次使用自动下载）
- [ ] 已测试连接

**测试命令**：
```
在 Kiro 中输入：打开 https://example.com 并截图
```

**预期结果**：
```
✅ 返回截图
```

**注意**：
- ⚠️ 首次使用会下载 Chromium（约 150MB）
- ⚠️ 需要较好的网络连接

---

### 8. Sequential Thinking MCP

- [ ] 已添加到配置文件
- [ ] `disabled: false`（如果需要）
- [ ] 已测试连接

**测试命令**：
```
在 Kiro 中输入：分析老年人用药提醒的完整流程
```

**预期结果**：
```
✅ 返回分析结果
```

---

### 9. Context7 MCP

- [ ] 已添加到配置文件
- [ ] Context7 API Key 已获取
- [ ] API Key 已配置
- [ ] `disabled: false`（如果需要）
- [ ] 已测试连接

**获取 API Key**：
- 访问：https://upstash.com/
- 参考：[API Keys 获取指南](API_KEYS_GUIDE.md#4-context7-api-key)

**测试命令**：
```
在 Kiro 中输入：记住：桑梓智护项目使用 Next.js 16
```

**预期结果**：
```
✅ 确认已记住
```

---

## 🔧 配置后检查

### 连接状态检查

- [ ] 打开 Kiro 侧边栏
- [ ] 找到 "MCP Servers" 面板
- [ ] 检查各个 Server 的连接状态
- [ ] 所有启用的 Server 都显示 "Connected"

### 日志检查

- [ ] 按 `Ctrl+Shift+P` 打开命令面板
- [ ] 输入 `View: Toggle Output`
- [ ] 选择 "MCP" 频道
- [ ] 检查是否有错误信息

### 功能测试

- [ ] Supabase MCP：查询数据库表
- [ ] Shadcn MCP：列出组件
- [ ] Filesystem MCP：列出文件
- [ ] GitHub MCP：列出仓库（如果启用）
- [ ] Brave Search MCP：搜索文档（如果启用）

---

## 🔒 安全检查

### API Keys 安全

- [ ] `.kiro/settings/mcp.json` 已添加到 `.gitignore`
- [ ] API Keys 没有提交到 Git
- [ ] API Keys 没有在代码中硬编码
- [ ] API Keys 没有在公开场合分享

### 权限检查

- [ ] GitHub Token 只授予必要的权限
- [ ] Supabase Service Role Key 使用谨慎
- [ ] 了解各个 API Key 的权限范围

### 备份检查

- [ ] 已备份 `.kiro/settings/mcp.json`
- [ ] 已记录所有 API Keys（安全存储）
- [ ] 已记录 API Keys 的过期时间

---

## 📊 配置状态总览

### 当前配置

| MCP Server | 状态 | 优先级 | 测试结果 |
|-----------|------|--------|---------|
| Supabase | ✅ 已启用 | ⭐⭐⭐ | ⬜ 待测试 |
| Shadcn | ✅ 已启用 | ⭐⭐⭐ | ⬜ 待测试 |
| Filesystem | ✅ 已启用 | ⭐⭐⭐ | ⬜ 待测试 |
| GitHub | ⏳ 待启用 | ⭐⭐ | ⬜ 待测试 |
| Brave Search | ⏳ 待启用 | ⭐⭐ | ⬜ 待测试 |
| PostgreSQL | ⏳ 待启用 | ⭐ | ⬜ 待测试 |
| Puppeteer | ⏳ 待启用 | ⭐ | ⬜ 待测试 |
| Sequential Thinking | ⏳ 待启用 | ⭐ | ⬜ 待测试 |
| Context7 | ⏳ 待启用 | ⭐ | ⬜ 待测试 |

### 完成度

- **必装 MCP Servers**：3/3 ✅
- **推荐 MCP Servers**：0/2 ⏳
- **可选 MCP Servers**：0/4 ⏳
- **总体完成度**：33% (3/9)

---

## 🎯 下一步行动

### 立即行动（必做）

1. ✅ 测试 Supabase MCP
2. ✅ 测试 Shadcn MCP
3. ✅ 测试 Filesystem MCP

### 短期行动（推荐）

4. ⏳ 获取 GitHub Personal Access Token
5. ⏳ 配置并测试 GitHub MCP
6. ⏳ 获取 Brave Search API Key
7. ⏳ 配置并测试 Brave Search MCP

### 长期行动（可选）

8. ⏳ 根据需要配置 PostgreSQL MCP
9. ⏳ 根据需要配置 Puppeteer MCP
10. ⏳ 根据需要配置其他 MCP Servers

---

## 🔄 定期维护

### 每周检查

- [ ] 查看 MCP Servers 连接状态
- [ ] 检查 API 配额使用情况
- [ ] 查看日志是否有错误

### 每月检查

- [ ] 更新即将过期的 API Keys
- [ ] 审查 API Keys 权限
- [ ] 清理不再使用的 MCP Servers

### 每季度检查

- [ ] 更新所有 API Keys
- [ ] 审查安全设置
- [ ] 优化 MCP 配置

---

## 📚 相关文档

- [MCP Servers 完整配置教程](MCP_COMPLETE_SETUP_GUIDE.md)
- [API Keys 获取指南](API_KEYS_GUIDE.md)
- [MCP & Powers 配置指南](../02-technical/MCP_POWERS_SETUP_GUIDE.md)

---

## 💡 小贴士

1. **优先配置必装的 MCP Servers**，确保基础功能可用
2. **逐步启用其他 MCP Servers**，避免一次性配置太多
3. **定期检查配置状态**，确保所有 Server 正常运行
4. **注意 API 配额**，避免超出限制
5. **保护好 API Keys**，不要泄露到公开场合

---

*MCP 配置检查清单 · 桑梓智护项目*
