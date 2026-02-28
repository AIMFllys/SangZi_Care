# 快速开始 - 本地测试

这是桑梓智护项目的快速启动指南，帮助你在 5 分钟内启动本地开发环境。

## 🚀 一键启动（推荐）

### Windows 用户

**方式 1：使用批处理脚本（推荐）**

双击运行以下脚本：

1. **启动开发服务**
   ```
   双击 scripts/start-dev.bat
   ```
   这会自动：
   - 检查 Node.js 和 Python 环境
   - 安装依赖（如果未安装）
   - 启动后端服务（端口 8000）
   - 启动前端服务（端口 3000）
   - 自动打开浏览器

2. **停止开发服务**
   ```
   双击 scripts/stop-dev.bat
   ```

3. **运行所有测试**
   ```
   双击 scripts/test-all.bat
   ```

**方式 2：使用 PowerShell 脚本**

右键点击 `scripts/start-dev.ps1` → 选择"使用 PowerShell 运行"

如果遇到执行策略错误，以管理员身份运行 PowerShell 并执行：
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 访问地址

启动成功后，访问以下地址：

- **前端应用**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

## 📋 手动启动

如果你想手动控制启动过程：

### 第一步：安装依赖

**前端依赖**
```bash
npm install
```

**后端依赖**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 第二步：配置环境变量

确保项目根目录有 `.env` 文件，并配置 Supabase：

```env
# Supabase (必需配置)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 其他配置已预设，可直接使用
```

**如何获取 Supabase 配置？**
1. 访问 https://supabase.com 并登录
2. 创建新项目或选择现有项目
3. 在 Settings > API 中找到：
   - Project URL → `SUPABASE_URL`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

### 第三步：创建数据库表

在 Supabase Dashboard 的 SQL Editor 中执行 `backend/database-init.sql`

### 第四步：启动服务

**终端 1 - 启动后端**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**终端 2 - 启动前端**
```bash
npm run dev
```

## 🧪 运行测试

**前端测试**
```bash
npm test
```

**后端测试**
```bash
cd backend
venv\Scripts\activate
python -m pytest
```

**或使用一键测试脚本**
```
双击 scripts/test-all.bat
```

## 📱 测试功能

### 1. 测试登录注册

访问 http://localhost:3000/login

- 注册新用户（选择角色：老年人/家属）
- 登录系统

### 2. 测试 AI 语音助手

访问 http://localhost:3000/voice

- 点击麦克风图标开始语音对话
- 或输入文字进行对话
- 测试语音合成（TTS）

### 3. 测试用药管理

访问 http://localhost:3000/medicine

- 创建用药计划
- 查看用药提醒
- 记录服药情况

### 4. 测试健康记录

访问 http://localhost:3000/health

- 录入血压、血糖、心率等数据
- 查看健康趋势图表

### 5. 测试消息功能

访问 http://localhost:3000/messages

- 发送文字消息
- 发送语音消息
- 查看消息历史

### 6. 测试后端 API

访问 http://localhost:8000/docs

- 查看所有 API 接口
- 在线测试 API（Swagger UI）

## 🐛 常见问题

### 问题 1：端口被占用

**错误**: `Address already in use`

**解决方案**:
```bash
# 方法 1：使用 scripts/stop-dev.bat 停止服务
双击 scripts/stop-dev.bat

# 方法 2：手动查找并关闭进程
netstat -ano | findstr :8000
taskkill /PID <进程ID> /F
```

### 问题 2：Python 虚拟环境激活失败

**错误**: `无法加载文件 venv\Scripts\Activate.ps1`

**解决方案**:
```powershell
# 使用 CMD 而不是 PowerShell
# 或在 PowerShell 中运行：
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 问题 3：依赖安装失败

**解决方案**:
```bash
# 清理并重新安装
rm -rf node_modules
npm install

# 后端
cd backend
rm -rf venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 问题 4：Supabase 连接失败

**检查清单**:
- [ ] `.env` 文件中的 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 已填写
- [ ] Supabase 项目状态为 Active
- [ ] 数据库表已创建
- [ ] 网络连接正常

### 问题 5：前端页面空白

**解决方案**:
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签的错误信息
3. 查看 Network 标签的网络请求
4. 确认后端服务已启动（访问 http://localhost:8000/health）

## 📚 详细文档

需要更详细的说明？查看以下文档：

- **完整测试指南**: [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)
- **配置检查清单**: [CHECKLIST.md](./CHECKLIST.md)
- **故障排查指南**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **文档索引**: [LOCAL_TESTING_INDEX.md](./LOCAL_TESTING_INDEX.md)
- **项目 README**: [../../README.md](../../README.md)

## 🎯 下一步

完成本地测试后，你可以：

1. **开发新功能**
   - 修改代码（支持热重载）
   - 运行测试确保功能正常

2. **构建生产版本**
   ```bash
   npm run build
   ```

3. **构建 Android APK**
   ```bash
   cd android
   bash build_apk.sh
   ```

4. **部署到服务器**
   - 参考 [../../README.md](../../README.md) 中的部署章节

## 💡 开发提示

### 推荐的开发工具

- **VS Code**: 推荐的代码编辑器
- **Chrome DevTools**: 前端调试
- **Postman**: API 测试
- **DB Browser for SQLite**: 数据库查看（如需本地调试）

### 推荐的 VS Code 插件

- ESLint
- Prettier
- Python
- TypeScript and JavaScript Language Features
- REST Client

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 提交前运行测试
- 使用语义化的提交信息（feat/fix/docs 等）

## 🆘 获取帮助

遇到问题？

1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 的常见问题章节
2. 查看项目 Issues
3. 提交新的 Issue

---

**祝你开发顺利！** 🎉

桑梓智护 · 智护银龄 — 让科技温暖每一位老人 ❤️
