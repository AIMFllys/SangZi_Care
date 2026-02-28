# 本地测试文件总览 📁

本文档列出了为本地测试创建的所有文件及其用途。

## 📂 文件结构

```
项目根目录/
│
├── docs/03-tutorials/
│   ├── 📄 QUICK_START.md                # 快速开始指南（5分钟上手）
│   ├── 📄 CHECKLIST.md                  # 配置检查清单
│   ├── 📄 TROUBLESHOOTING.md            # 故障排查指南
│   ├── 📄 LOCAL_TESTING_GUIDE.md        # 完整本地测试指南
│   ├── 📄 LOCAL_TESTING_INDEX.md        # 测试文档索引
│   └── 📄 LOCAL_TESTING_FILES.md        # 本文档（文件总览）
│
├── scripts/
│   ├── 🔧 start-dev.bat                 # Windows 启动脚本（CMD）
│   ├── 🔧 start-dev.ps1                 # Windows 启动脚本（PowerShell）
│   ├── 🔧 stop-dev.bat                  # Windows 停止脚本
│   └── 🔧 test-all.bat                  # 运行所有测试脚本
│
├── backend/
│   ├── 🗄️ database-init.sql             # Supabase 数据库初始化脚本
│   └── 🧪 test-api.http                 # API 测试文件（REST Client）
│
└── ⚙️ .env                               # 环境变量配置（已存在）
```

## 📋 文件详情

### 1. 文档文件

#### docs/03-tutorials/QUICK_START.md ⭐
- **用途**: 快速开始指南，5 分钟内启动项目
- **适用人群**: 新手、首次使用者
- **内容**:
  - 一键启动说明
  - 手动启动步骤
  - 基础功能测试
  - 常见问题快速解答

#### docs/03-tutorials/CHECKLIST.md ✅
- **用途**: 配置检查清单，确保环境配置正确
- **适用人群**: 所有用户
- **内容**:
  - 环境准备检查
  - 依赖安装检查
  - 配置文件检查
  - 服务启动检查
  - 功能测试检查

#### docs/03-tutorials/TROUBLESHOOTING.md 🔧
- **用途**: 故障排查指南，解决常见问题
- **适用人群**: 遇到问题的用户
- **内容**:
  - 环境问题
  - 依赖安装问题
  - 服务启动问题
  - 数据库连接问题
  - API 调用问题
  - 前端显示问题
  - 测试运行问题
  - 性能问题

#### docs/03-tutorials/LOCAL_TESTING_GUIDE.md 📖
- **用途**: 完整的本地测试指南
- **适用人群**: 需要详细说明的用户
- **内容**:
  - 详细的环境配置步骤
  - Supabase 配置说明
  - 完整的功能测试方法
  - 性能测试指南
  - 安全注意事项

#### docs/03-tutorials/LOCAL_TESTING_INDEX.md 📚
- **用途**: 测试文档索引和导航
- **适用人群**: 所有用户
- **内容**:
  - 文档列表和关系
  - 使用场景指南
  - 快速查找功能
  - 常见问题链接

### 2. 脚本文件

#### scripts/start-dev.bat 🚀
- **用途**: Windows 批处理启动脚本
- **平台**: Windows (CMD)
- **功能**:
  - 检查 Node.js 和 Python 环境
  - 自动安装依赖（如未安装）
  - 启动后端服务（端口 8000）
  - 启动前端服务（端口 3000）
  - 自动打开浏览器

#### scripts/start-dev.ps1 🚀
- **用途**: Windows PowerShell 启动脚本
- **平台**: Windows (PowerShell)
- **功能**: 与 start-dev.bat 相同，但使用 PowerShell 语法

#### scripts/stop-dev.bat 🛑
- **用途**: 停止开发服务
- **平台**: Windows (CMD)
- **功能**:
  - 查找并停止前端服务（端口 3000）
  - 查找并停止后端服务（端口 8000）

#### scripts/test-all.bat 🧪
- **用途**: 运行所有测试
- **平台**: Windows (CMD)
- **功能**:
  - 运行前端测试（npm test）
  - 运行后端测试（pytest）
  - 显示测试结果统计

### 3. 配置文件

#### backend/database-init.sql 🗄️
- **用途**: Supabase 数据库初始化脚本
- **使用方式**: 在 Supabase SQL Editor 中执行
- **功能**:
  - 创建 8 个数据库表
  - 创建索引以提升性能
  - 插入测试数据（可选）
  - 包含详细的表结构注释

#### backend/test-api.http 🧪
- **用途**: API 测试文件
- **使用方式**: 使用 VS Code REST Client 插件
- **功能**:
  - 测试所有主要 API 接口
  - 包含 20+ 个测试用例
  - 自动管理 token

#### .env ⚙️
- **用途**: 环境变量配置（已存在）
- **内容**:
  - 火山引擎 API 密钥（已配置）
  - Supabase 配置（需填写）
  - JWT 密钥

## 🎯 使用流程

### 新手推荐流程

```
1. 阅读 docs/03-tutorials/QUICK_START.md
   ↓
2. 双击 scripts/start-dev.bat
   ↓
3. 使用 docs/03-tutorials/CHECKLIST.md 验证配置
   ↓
4. 如遇问题，查看 docs/03-tutorials/TROUBLESHOOTING.md
   ↓
5. 需要详细说明时，查看 docs/03-tutorials/LOCAL_TESTING_GUIDE.md
```

### 日常开发流程

```
1. 双击 scripts/start-dev.bat 启动服务
   ↓
2. 开发和测试功能
   ↓
3. 双击 scripts/test-all.bat 运行测试
   ↓
4. 双击 scripts/stop-dev.bat 停止服务
```

### 数据库配置流程

```
1. 创建 Supabase 项目
   ↓
2. 在 SQL Editor 中执行 backend/database-init.sql
   ↓
3. 在 .env 中填写 Supabase 配置
   ↓
4. 重启后端服务
```

## 📊 文件统计

| 类型 | 数量 | 文件 |
|------|------|------|
| 文档 | 6 | QUICK_START.md, CHECKLIST.md, TROUBLESHOOTING.md, LOCAL_TESTING_GUIDE.md, LOCAL_TESTING_INDEX.md, LOCAL_TESTING_FILES.md |
| 脚本 | 4 | start-dev.bat, start-dev.ps1, stop-dev.bat, test-all.bat |
| 配置 | 2 | database-init.sql, test-api.http |
| **总计** | **12** | |

## 🔗 文件关系

```
docs/03-tutorials/QUICK_START.md (入口文档)
    ├── scripts/start-dev.bat (启动)
    ├── scripts/start-dev.ps1 (启动)
    ├── scripts/stop-dev.bat (停止)
    └── scripts/test-all.bat (测试)

docs/03-tutorials/CHECKLIST.md (验证)
    └── docs/03-tutorials/LOCAL_TESTING_GUIDE.md (详细说明)

docs/03-tutorials/TROUBLESHOOTING.md (问题排查)
    └── docs/03-tutorials/LOCAL_TESTING_GUIDE.md (参考)

backend/database-init.sql (数据库)
    └── .env (配置)

backend/test-api.http (API 测试)
    └── docs/03-tutorials/LOCAL_TESTING_GUIDE.md (测试说明)

docs/03-tutorials/LOCAL_TESTING_INDEX.md (导航)
    └── 所有文档
```

## 💡 使用建议

### 建议 1：按顺序阅读
首次使用时，建议按以下顺序阅读文档：
1. docs/03-tutorials/QUICK_START.md
2. docs/03-tutorials/CHECKLIST.md
3. docs/03-tutorials/LOCAL_TESTING_GUIDE.md（需要时）
4. docs/03-tutorials/TROUBLESHOOTING.md（遇到问题时）

### 建议 2：收藏常用文档
将以下文档加入浏览器书签：
- docs/03-tutorials/QUICK_START.md（快速参考）
- docs/03-tutorials/TROUBLESHOOTING.md（问题排查）
- docs/03-tutorials/LOCAL_TESTING_INDEX.md（文档导航）

### 建议 3：使用脚本
不要手动启动服务，使用提供的脚本可以：
- 节省时间
- 避免遗漏步骤
- 自动处理常见问题

### 建议 4：保持文档更新
如果你修改了配置或添加了新功能，记得更新相关文档。

## 🔄 维护说明

### 文档维护
- 定期检查文档是否与代码同步
- 更新版本号和日期
- 添加新的常见问题

### 脚本维护
- 测试脚本在不同 Windows 版本上的兼容性
- 根据项目变化更新脚本逻辑
- 添加更多错误处理

### 配置维护
- 更新 backend/database-init.sql 以反映数据库结构变化
- 更新 backend/test-api.http 以包含新的 API 接口
- 保持 .env 示例与实际需求同步

## 📝 贡献指南

如果你想改进这些文档或脚本：

1. **发现问题** - 记录你遇到的问题
2. **提出改进** - 在 Issue 中描述改进建议
3. **提交 PR** - 修改文档或脚本并提交
4. **更新索引** - 如果添加新文件，更新本文档

## 🎉 总结

这套本地测试文件系统包含：
- ✅ 6 个详细文档（位于 docs/03-tutorials/）
- ✅ 4 个自动化脚本（位于 scripts/）
- ✅ 2 个配置文件（位于 backend/）
- ✅ 完整的使用指南
- ✅ 全面的问题排查

**目标**：让任何人都能在 5 分钟内启动项目并开始开发！

---

**提示**：如果你是第一次使用，从 [docs/03-tutorials/QUICK_START.md](./QUICK_START.md) 开始！

**桑梓智护 · 智护银龄** — 让科技温暖每一位老人 ❤️
