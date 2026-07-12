# 本地测试文档索引 📚

本文档汇总了所有与本地测试相关的文档和工具，帮助你快速找到需要的信息。

## 🚀 快速开始

### 新手推荐路径

1. **[QUICK_START.md](./QUICK_START.md)** ⭐
   - 5 分钟快速启动指南
   - 一键启动脚本使用说明
   - 基础功能测试

2. **[CHECKLIST.md](./CHECKLIST.md)** ✅
   - 完整的配置检查清单
   - 逐步验证环境配置
   - 确保所有功能正常

3. **[LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)** 📖
   - 详细的本地测试指南
   - 完整的配置说明
   - 功能模块测试方法

## 📁 文档列表

### 核心文档

| 文档 | 描述 | 适用场景 |
|------|------|----------|
| [QUICK_START.md](./QUICK_START.md) | 快速开始指南 | 首次使用，快速上手 |
| [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md) | 完整测试指南 | 详细配置和测试 |
| [CHECKLIST.md](./CHECKLIST.md) | 配置检查清单 | 验证环境配置 |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 故障排查指南 | 遇到问题时查阅 |

### 配置文件

| 文件 | 描述 | 用途 |
|------|------|------|
| `.env` | 环境变量配置 | 配置 API 密钥和数据库连接 |
| `backend/database-init.sql` | 数据库初始化脚本 | 在 Supabase 中创建表 |
| `backend/test-api.http` | API 测试文件 | 使用 REST Client 测试 API |

### 启动脚本

| 脚本 | 描述 | 平台 |
|------|------|------|
| `scripts/start-dev.bat` | 启动开发服务 | Windows (CMD) |
| `scripts/start-dev.ps1` | 启动开发服务 | Windows (PowerShell) |
| `scripts/stop-dev.bat` | 停止开发服务 | Windows (CMD) |
| `scripts/test-all.bat` | 运行所有测试 | Windows (CMD) |

## 🎯 使用场景指南

### 场景 1：首次配置环境

**推荐步骤**：
1. 阅读 [QUICK_START.md](./QUICK_START.md)
2. 运行 `scripts/start-dev.bat` 或 `scripts/start-dev.ps1`
3. 使用 [CHECKLIST.md](./CHECKLIST.md) 验证配置
4. 如遇问题，查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### 场景 2：日常开发

**推荐步骤**：
1. 运行 `scripts/start-dev.bat` 启动服务
2. 开发和测试功能
3. 运行 `scripts/test-all.bat` 验证代码
4. 运行 `scripts/stop-dev.bat` 停止服务

### 场景 3：测试 API

**推荐步骤**：
1. 启动后端服务
2. 使用 `backend/test-api.http` 文件测试 API
3. 或访问 http://localhost:8000/docs 使用 Swagger UI

### 场景 4：配置数据库

**推荐步骤**：
1. 创建 Supabase 项目
2. 在 SQL Editor 中执行 `backend/database-init.sql`
3. 在 `.env` 中配置 Supabase 连接信息
4. 重启后端服务

### 场景 5：排查问题

**推荐步骤**：
1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. 查看对应的错误类型章节
3. 按照解决方案逐步排查
4. 如仍无法解决，提交 Issue

## 📊 文档关系图

```
QUICK_START.md (入口)
    ├── scripts/start-dev.bat/ps1 (启动脚本)
    ├── CHECKLIST.md (验证配置)
    │   └── LOCAL_TESTING_GUIDE.md (详细说明)
    └── TROUBLESHOOTING.md (问题排查)

.env (配置文件)
    └── backend/database-init.sql (数据库初始化)

backend/test-api.http (API 测试)
    └── LOCAL_TESTING_GUIDE.md (测试说明)
```

## 🔍 快速查找

### 我想...

- **快速启动项目** → [QUICK_START.md](./QUICK_START.md)
- **检查配置是否正确** → [CHECKLIST.md](./CHECKLIST.md)
- **了解详细配置步骤** → [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)
- **解决启动问题** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 服务启动问题
- **解决数据库问题** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 数据库连接问题
- **测试 API 接口** → `backend/test-api.http` 或 http://localhost:8000/docs
- **配置 Supabase** → `backend/database-init.sql` + [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)
- **运行测试** → `scripts/test-all.bat` 或 [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md) - 运行测试章节

## 📝 常见问题快速链接

| 问题 | 解决方案 |
|------|----------|
| 端口被占用 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#问题后端端口被占用) |
| 依赖安装失败 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#依赖安装问题) |
| Supabase 连接失败 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#问题supabase-连接失败) |
| 页面空白 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#问题页面空白) |
| API 401 错误 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#问题401-unauthorized) |
| PowerShell 执行策略错误 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#问题powershell-执行策略错误) |

## 🛠️ 工具推荐

### VS Code 插件

- **REST Client** - 用于测试 `test-api.http` 文件
- **ESLint** - JavaScript/TypeScript 代码检查
- **Python** - Python 开发支持
- **Prettier** - 代码格式化

### 浏览器工具

- **Chrome DevTools** - 前端调试
- **React Developer Tools** - React 组件调试
- **Lighthouse** - 性能分析

### API 测试工具

- **Swagger UI** - http://localhost:8000/docs
- **REST Client** - VS Code 插件
- **Postman** - 独立 API 测试工具
- **curl** - 命令行 HTTP 客户端

## 📚 相关文档

### 项目文档

- [README.md](../../README.md) - 项目总览
- [ARCHITECTURE.md](../../.agent/ARCHITECTURE.md) - 架构设计
- [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md) - API 密钥配置

### 开发文档

- [开发文档](../04-development/README.md) - 开发规范和最佳实践
- [MCP 配置指南](./MCP_COMPLETE_SETUP_GUIDE.md) - MCP 工具配置

### 规划文档

- [项目计划](../01-planning/plan.md) - 项目规划和需求
- [设计文档](../../.kiro/specs/sangzi-smart-care-mobile/design.md) - 详细设计

## 💡 使用技巧

### 技巧 1：使用快捷脚本

不要每次都手动启动服务，使用提供的脚本：
```bash
# Windows
双击 scripts/start-dev.bat

# 或 PowerShell
scripts/start-dev.ps1
```

### 技巧 2：保持文档打开

在开发时，保持以下文档在浏览器中打开：
- API 文档：http://localhost:8000/docs
- 本地测试指南：[LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)

### 技巧 3：使用检查清单

每次配置新环境时，使用 [CHECKLIST.md](./CHECKLIST.md) 确保不遗漏任何步骤。

### 技巧 4：收藏故障排查指南

将 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 加入书签，遇到问题时快速查找。

### 技巧 5：使用 REST Client

在 VS Code 中安装 REST Client 插件，直接在 `backend/test-api.http` 文件中测试 API。

## 🔄 更新日志

### 2024-01-01
- 创建本地测试文档索引
- 添加快速查找功能
- 整理文档关系图

## 🆘 获取帮助

如果你在使用这些文档时遇到问题：

1. **检查文档是否最新** - 查看项目最新版本
2. **搜索已有 Issues** - 可能其他人遇到过相同问题
3. **提交新 Issue** - 描述你的问题和使用场景
4. **联系开发团队** - 通过项目 Issue 系统

---

**提示**：建议将此文档加入书签，作为本地测试的导航页面。

**桑梓智护 · 智护银龄** — 让科技温暖每一位老人 ❤️
