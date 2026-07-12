# 本地测试检查清单 ✅

使用此清单确保你的本地开发环境配置正确。

## 📋 环境准备

- [ ] 已安装 Node.js 18+ （运行 `node --version` 检查）
- [ ] 已安装 Python 3.9+ （运行 `python --version` 检查）
- [ ] 已安装 Git （运行 `git --version` 检查）
- [ ] 已克隆项目到本地

## 📦 依赖安装

- [ ] 前端依赖已安装 （运行 `npm install`）
- [ ] 后端虚拟环境已创建 （`cd backend && python -m venv venv`）
- [ ] 后端依赖已安装 （激活虚拟环境后运行 `pip install -r requirements.txt`）

## ⚙️ 配置文件

- [ ] 项目根目录存在 `.env` 文件
- [ ] `.env` 文件中已配置 `SUPABASE_URL`
- [ ] `.env` 文件中已配置 `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 火山引擎配置已就绪（默认已配置，无需修改）

## 🗄️ 数据库设置

- [ ] 已创建 Supabase 项目
- [ ] 已在 Supabase SQL Editor 中执行 `database-init.sql`
- [ ] 数据库表创建成功（8 个表）
- [ ] 测试数据已插入（可选）

## 🚀 服务启动

- [ ] 后端服务启动成功 （访问 http://localhost:8000/health 返回 `{"status":"ok"}`）
- [ ] 前端服务启动成功 （访问 http://localhost:3000 显示登录页）
- [ ] API 文档可访问 （访问 http://localhost:8000/docs）

## 🧪 功能测试

### 基础功能
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 角色选择功能正常（老年人/家属）

### 核心功能
- [ ] AI 语音助手页面可访问 （http://localhost:3000/voice）
- [ ] 用药管理页面可访问 （http://localhost:3000/medicine）
- [ ] 健康记录页面可访问 （http://localhost:3000/health）
- [ ] 消息功能页面可访问 （http://localhost:3000/messages）
- [ ] 设置页面可访问 （http://localhost:3000/settings）

### API 测试
- [ ] 健康检查接口正常 （`GET /health`）
- [ ] 用户注册接口正常 （`POST /api/v1/auth/register`）
- [ ] 用户登录接口正常 （`POST /api/v1/auth/login`）
- [ ] AI 对话接口正常 （`POST /api/v1/ai/chat`）

## 🔬 测试运行

- [ ] 前端测试通过 （运行 `npm test`）
- [ ] 后端测试通过 （运行 `cd backend && python -m pytest`）
- [ ] 无测试失败或错误

## 🎯 快捷脚本测试（Windows）

- [ ] `start-dev.bat` 可以正常启动服务
- [ ] `stop-dev.bat` 可以正常停止服务
- [ ] `test-all.bat` 可以运行所有测试

## 🌐 浏览器测试

- [ ] Chrome 浏览器可正常访问
- [ ] 页面无 JavaScript 错误（F12 查看 Console）
- [ ] 网络请求正常（F12 查看 Network）
- [ ] 页面样式正常显示

## 📱 移动端测试（可选）

- [ ] 浏览器移动端模式显示正常（F12 > Toggle device toolbar）
- [ ] 触摸操作响应正常
- [ ] 适老化样式正确应用（大字体、高对比度）

## 🔒 安全检查

- [ ] `.env` 文件未提交到 Git
- [ ] `.gitignore` 包含 `.env`
- [ ] 生产环境密钥已更换（如部署到生产环境）

## 📊 性能检查

- [ ] 前端页面加载时间 < 3 秒
- [ ] API 响应时间 < 500ms
- [ ] 无明显的性能警告

## 🐛 常见问题排查

如果遇到问题，检查以下项：

### 后端无法启动
- [ ] 端口 8000 未被占用
- [ ] Python 虚拟环境已激活
- [ ] 所有依赖已安装
- [ ] `.env` 文件配置正确

### 前端无法启动
- [ ] 端口 3000 未被占用
- [ ] Node.js 版本 >= 18
- [ ] `node_modules` 已安装
- [ ] 无 TypeScript 编译错误

### 数据库连接失败
- [ ] Supabase URL 正确
- [ ] Service Role Key 正确
- [ ] 网络连接正常
- [ ] Supabase 项目状态为 Active

### API 调用失败
- [ ] 后端服务已启动
- [ ] CORS 配置正确
- [ ] 请求头包含正确的 Authorization
- [ ] 请求体格式正确

## ✅ 完成确认

当所有项目都打勾后，你的本地开发环境就配置完成了！

**下一步**：
1. 开始开发新功能
2. 查看 `docs/04-development/README.md` 了解开发规范
3. 查看 `QUICK_START.md` 了解更多使用技巧

---

**提示**：将此文件保存为你的个人检查清单，每次设置新环境时使用。

**问题反馈**：如果遇到清单中未涵盖的问题，请查看 `docs/03-tutorials/LOCAL_TESTING_GUIDE.md` 或提交 Issue。
