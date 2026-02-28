# 本地测试文档说明

本目录包含桑梓智护项目的完整本地测试文档和工具。

## 📚 文档列表

### 快速入门
- **[QUICK_START.md](./QUICK_START.md)** - 5分钟快速启动指南，适合新手

### 配置验证
- **[CHECKLIST.md](./CHECKLIST.md)** - 完整的配置检查清单

### 详细指南
- **[LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)** - 完整的本地测试指南，包含详细配置步骤

### 问题排查
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - 常见问题和解决方案

### 导航索引
- **[LOCAL_TESTING_INDEX.md](./LOCAL_TESTING_INDEX.md)** - 所有测试文档的导航和索引
- **[LOCAL_TESTING_FILES.md](./LOCAL_TESTING_FILES.md)** - 文件结构和说明

## 🔧 相关工具

### 启动脚本（位于项目根目录 `scripts/`）
- `scripts/start-dev.bat` - Windows CMD 启动脚本
- `scripts/start-dev.ps1` - Windows PowerShell 启动脚本
- `scripts/stop-dev.bat` - 停止服务脚本
- `scripts/test-all.bat` - 运行所有测试

### 配置文件（位于 `backend/`）
- `backend/database-init.sql` - Supabase 数据库初始化脚本
- `backend/test-api.http` - API 测试文件

## 🚀 快速开始

1. 阅读 [QUICK_START.md](./QUICK_START.md)
2. 双击运行 `scripts/start-dev.bat`
3. 访问 http://localhost:3000

## 📖 推荐阅读顺序

### 首次使用
1. [QUICK_START.md](./QUICK_START.md) - 了解如何快速启动
2. [CHECKLIST.md](./CHECKLIST.md) - 验证配置是否正确
3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 遇到问题时查阅

### 深入了解
1. [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md) - 详细的配置和测试说明
2. [LOCAL_TESTING_INDEX.md](./LOCAL_TESTING_INDEX.md) - 文档导航
3. [LOCAL_TESTING_FILES.md](./LOCAL_TESTING_FILES.md) - 文件结构说明

## 🎯 使用场景

| 场景 | 推荐文档 |
|------|----------|
| 首次配置环境 | [QUICK_START.md](./QUICK_START.md) |
| 验证配置 | [CHECKLIST.md](./CHECKLIST.md) |
| 遇到问题 | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| 需要详细说明 | [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md) |
| 查找文档 | [LOCAL_TESTING_INDEX.md](./LOCAL_TESTING_INDEX.md) |

## 💡 提示

- 所有脚本都位于项目根目录的 `scripts/` 文件夹
- 数据库和 API 测试文件位于 `backend/` 文件夹
- 建议将常用文档加入浏览器书签

## 🆘 获取帮助

如果遇到问题：
1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. 查看项目 Issues
3. 提交新的 Issue

---

**桑梓智护 · 智护银龄** — 让科技温暖每一位老人 ❤️
