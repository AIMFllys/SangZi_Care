# 桑梓智护 - 开发脚本说明

本目录包含用于本地开发的各种脚本工具。

## 📜 脚本列表

### 🚀 启动脚本

#### `dev.bat` (推荐)
**Windows 批处理脚本 - 一键启动开发环境**

```bash
# 双击运行或在 CMD 中执行
scripts\dev.bat
```

功能：
- ✅ 自动检查 Node.js 和 Python 环境
- ✅ 自动安装前后端依赖（如果未安装）
- ✅ 自动创建 Python 虚拟环境（如果未创建）
- ✅ 同时启动前端和后端服务
- ✅ 提供友好的中文界面
- ✅ 可选择是否自动打开浏览器

#### `dev.ps1`
**PowerShell 脚本 - 一键启动开发环境**

```powershell
# 在 PowerShell 中执行
.\scripts\dev.ps1
```

功能与 `dev.bat` 相同，但使用 PowerShell 语法。

**注意**: 如果遇到执行策略错误，请以管理员身份运行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### 🛑 停止脚本

#### `stop-dev.bat`
**停止所有开发服务**

```bash
scripts\stop-dev.bat
```

功能：
- 自动查找并终止占用端口 3000 的进程（前端）
- 自动查找并终止占用端口 8000 的进程（后端）

#### `stop-dev.ps1`
**PowerShell 版本的停止脚本**

```powershell
.\scripts\stop-dev.ps1
```

---

### 🔍 状态检查脚本

#### `check-status.bat`
**检查服务运行状态**

```bash
scripts\check-status.bat
```

功能：
- 检查前端服务（端口 3000）是否运行
- 检查后端服务（端口 8000）是否运行
- 显示进程 ID

---

### 📜 旧版脚本（保留兼容）

#### `start-dev.bat` / `start-dev.ps1`
旧版启动脚本，功能与新版 `dev.bat` / `dev.ps1` 类似。

建议使用新版 `dev.bat` / `dev.ps1`，界面更友好。

---

## 🎯 使用场景

### 场景 1: 首次启动项目

```bash
# 1. 克隆项目
git clone <repository-url>
cd sangzi-smart-care

# 2. 确保 .env 文件存在
# 如果没有，复制 .env.example 并配置

# 3. 运行启动脚本
scripts\dev.bat
```

脚本会自动：
- 检查环境
- 安装依赖
- 创建虚拟环境
- 启动服务

### 场景 2: 日常开发

```bash
# 启动开发环境
scripts\dev.bat

# 开发完成后停止服务
scripts\stop-dev.bat
```

### 场景 3: 检查服务状态

```bash
# 不确定服务是否在运行？
scripts\check-status.bat
```

### 场景 4: 服务异常

```bash
# 1. 停止所有服务
scripts\stop-dev.bat

# 2. 重新启动
scripts\dev.bat
```

---

## 🔧 脚本工作原理

### 启动流程

```
1. 环境检查
   ├─ 检查 Node.js 是否安装
   ├─ 检查 Python 是否安装
   └─ 显示版本信息

2. 依赖检查
   ├─ 检查 node_modules 是否存在
   │  └─ 不存在则运行 npm install
   └─ 检查 backend/venv 是否存在
      └─ 不存在则创建虚拟环境并安装依赖

3. 配置检查
   └─ 检查 .env 文件是否存在

4. 启动服务
   ├─ 启动后端服务 (端口 8000)
   │  └─ 在新窗口运行: uvicorn main:app --reload
   └─ 启动前端服务 (端口 3000)
      └─ 在新窗口运行: npm run dev

5. 完成
   └─ 显示访问地址
```

### 停止流程

```
1. 查找进程
   ├─ 查找占用端口 3000 的进程
   └─ 查找占用端口 8000 的进程

2. 终止进程
   ├─ 使用 taskkill 终止前端进程
   └─ 使用 taskkill 终止后端进程

3. 完成
   └─ 显示停止结果
```

---

## 🐛 常见问题

### Q1: 脚本无法执行

**CMD 脚本 (.bat)**:
- 确保以管理员身份运行（如果需要）
- 检查文件路径是否正确

**PowerShell 脚本 (.ps1)**:
```powershell
# 设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q2: 端口被占用

```bash
# 使用停止脚本
scripts\stop-dev.bat

# 或手动终止进程
netstat -ano | findstr :3000
taskkill /F /PID <进程ID>
```

### Q3: 依赖安装失败

**前端依赖**:
```bash
# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

**后端依赖**:
```bash
cd backend
rm -rf venv
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

### Q4: Python 虚拟环境激活失败

**PowerShell**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**CMD**:
- 通常不会有问题，确保路径正确即可

---

## 📝 脚本维护

### 添加新功能

如需修改脚本，请同时更新：
1. `dev.bat` (CMD 版本)
2. `dev.ps1` (PowerShell 版本)
3. 本 README 文档

### 测试脚本

在修改后，请在以下环境测试：
- Windows 10/11 CMD
- Windows 10/11 PowerShell
- Windows Terminal

---

## 🔗 相关文档

- [本地开发指南](../docs/本地开发指南.md)
- [快速开始](../docs/03-tutorials/QUICK_START.md)
- [故障排查](../docs/03-tutorials/TROUBLESHOOTING.md)

---

**桑梓智护 · 智护银龄** — 让科技温暖每一位老人 ❤️
