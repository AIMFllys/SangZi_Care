# 故障排查指南 🔧

本文档列出了在本地测试桑梓智护项目时可能遇到的常见问题及解决方案。

## 📑 目录

- [环境问题](#环境问题)
- [依赖安装问题](#依赖安装问题)
- [服务启动问题](#服务启动问题)
- [数据库连接问题](#数据库连接问题)
- [API 调用问题](#api-调用问题)
- [前端显示问题](#前端显示问题)
- [测试运行问题](#测试运行问题)
- [性能问题](#性能问题)

---

## 环境问题

### 问题：找不到 Node.js 命令

**错误信息**：
```
'node' 不是内部或外部命令，也不是可运行的程序
```

**解决方案**：
1. 下载并安装 Node.js 18+ from https://nodejs.org/
2. 安装后重启命令行窗口
3. 验证安装：`node --version`

### 问题：找不到 Python 命令

**错误信息**：
```
'python' 不是内部或外部命令，也不是可运行的程序
```

**解决方案**：
1. 下载并安装 Python 3.9+ from https://www.python.org/
2. 安装时勾选 "Add Python to PATH"
3. 安装后重启命令行窗口
4. 验证安装：`python --version`

### 问题：Python 版本过低

**错误信息**：
```
Python 3.8 is not supported
```

**解决方案**：
1. 卸载旧版本 Python
2. 安装 Python 3.9 或更高版本
3. 或使用 pyenv 管理多个 Python 版本

---

## 依赖安装问题

### 问题：npm install 失败

**错误信息**：
```
npm ERR! code EACCES
npm ERR! syscall access
```

**解决方案**：
```bash
# 方法 1：清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 方法 2：使用管理员权限
# 右键点击命令行 → 以管理员身份运行
npm install

# 方法 3：修改 npm 全局目录权限（不推荐）
```

### 问题：pip install 失败

**错误信息**：
```
ERROR: Could not find a version that satisfies the requirement
```

**解决方案**：
```bash
# 方法 1：升级 pip
python -m pip install --upgrade pip

# 方法 2：使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 方法 3：逐个安装依赖
pip install fastapi
pip install uvicorn[standard]
# ... 其他依赖
```

### 问题：虚拟环境创建失败

**错误信息**：
```
Error: [WinError 5] 拒绝访问
```

**解决方案**：
```bash
# 方法 1：使用管理员权限
# 右键点击命令行 → 以管理员身份运行

# 方法 2：检查杀毒软件是否阻止
# 临时关闭杀毒软件后重试

# 方法 3：使用不同的虚拟环境工具
pip install virtualenv
virtualenv venv
```

---

## 服务启动问题

### 问题：后端端口被占用

**错误信息**：
```
ERROR: [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)
```

**解决方案**：
```bash
# 方法 1：查找并关闭占用端口的进程
netstat -ano | findstr :8000
taskkill /PID <进程ID> /F

# 方法 2：使用其他端口
uvicorn main:app --reload --host 127.0.0.1 --port 8001

# 方法 3：使用 stop-dev.bat 停止所有服务
双击 stop-dev.bat
```

### 问题：前端端口被占用

**错误信息**：
```
Port 3000 is already in use
```

**解决方案**：
```bash
# Next.js 会自动尝试下一个可用端口（3001, 3002...）
# 或手动指定端口
npm run dev -- -p 3001

# 或查找并关闭占用端口的进程
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F
```

### 问题：PowerShell 执行策略错误

**错误信息**：
```
无法加载文件 venv\Scripts\Activate.ps1，因为在此系统上禁止运行脚本
```

**解决方案**：
```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# 或使用 CMD 而不是 PowerShell
venv\Scripts\activate.bat
```

### 问题：后端启动后立即退出

**可能原因**：
- 依赖未安装完整
- 配置文件错误
- Python 版本不兼容

**解决方案**：
```bash
# 1. 检查虚拟环境是否激活
cd backend
venv\Scripts\activate

# 2. 重新安装依赖
pip install -r requirements.txt

# 3. 手动启动查看详细错误
python -m uvicorn main:app --reload

# 4. 检查 .env 文件是否存在
```

---

## 数据库连接问题

### 问题：Supabase 连接失败

**错误信息**：
```
Connection refused
Could not connect to Supabase
```

**解决方案**：
1. **检查 .env 配置**
   ```bash
   # 确认以下配置已填写
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-key-here
   ```

2. **检查 Supabase 项目状态**
   - 登录 https://supabase.com
   - 确认项目状态为 "Active"
   - 检查项目是否暂停（免费版长期不用会暂停）

3. **检查网络连接**
   ```bash
   # 测试网络连接
   ping supabase.com
   ```

4. **检查 API Key 是否正确**
   - 在 Supabase Dashboard > Settings > API 中重新复制
   - 确保使用的是 Service Role Key（不是 anon key）

### 问题：数据库表不存在

**错误信息**：
```
relation "users" does not exist
```

**解决方案**：
1. 在 Supabase Dashboard 的 SQL Editor 中执行 `database-init.sql`
2. 确认所有 8 个表都已创建
3. 检查表名是否正确（区分大小写）

### 问题：数据库查询权限错误

**错误信息**：
```
permission denied for table users
```

**解决方案**：
1. 确认使用的是 Service Role Key（不是 anon key）
2. 检查 Row Level Security (RLS) 策略
3. 开发阶段可以暂时禁用 RLS：
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ```

---

## API 调用问题

### 问题：401 Unauthorized

**错误信息**：
```
{"detail": "Not authenticated"}
```

**解决方案**：
1. **确认已登录并获取 token**
   ```bash
   # 先调用登录接口
   POST /api/v1/auth/login
   ```

2. **检查 Authorization 头**
   ```bash
   # 正确格式
   Authorization: Bearer <your-token-here>
   ```

3. **检查 token 是否过期**
   - JWT token 默认有效期 24 小时
   - 过期后需要重新登录

### 问题：CORS 错误

**错误信息**：
```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**解决方案**：
1. 确认后端 CORS 配置正确（已在 `backend/main.py` 中配置）
2. 检查请求的 URL 是否正确
3. 清除浏览器缓存后重试

### 问题：404 Not Found

**错误信息**：
```
{"detail": "Not Found"}
```

**解决方案**：
1. **检查 API 路径是否正确**
   - 正确：`/api/v1/auth/login`
   - 错误：`/auth/login`

2. **检查 HTTP 方法是否正确**
   - 登录应该用 POST 而不是 GET

3. **查看 API 文档**
   - 访问 http://localhost:8000/docs
   - 确认接口路径和参数

### 问题：500 Internal Server Error

**错误信息**：
```
{"detail": "Internal server error"}
```

**解决方案**：
1. **查看后端日志**
   - 在后端命令行窗口查看详细错误信息

2. **检查请求参数**
   - 确认所有必需参数都已提供
   - 确认参数类型正确

3. **检查数据库连接**
   - 确认 Supabase 配置正确

---

## 前端显示问题

### 问题：页面空白

**可能原因**：
- JavaScript 错误
- API 调用失败
- 路由配置错误

**解决方案**：
1. **打开浏览器开发者工具（F12）**
   - 查看 Console 标签的错误信息
   - 查看 Network 标签的网络请求

2. **检查后端服务是否启动**
   ```bash
   # 访问健康检查接口
   http://localhost:8000/health
   ```

3. **清除浏览器缓存**
   - Ctrl + Shift + Delete
   - 清除缓存和 Cookie

4. **重新构建前端**
   ```bash
   rm -rf .next
   npm run dev
   ```

### 问题：样式显示异常

**可能原因**：
- CSS 文件未加载
- CSS Modules 配置错误
- 浏览器兼容性问题

**解决方案**：
1. **检查 CSS 文件是否存在**
   - `styles/globals.css`
   - 各组件的 `.module.css` 文件

2. **检查浏览器控制台的 404 错误**
   - 确认所有 CSS 文件都已加载

3. **使用现代浏览器**
   - Chrome 90+
   - Firefox 88+
   - Edge 90+

### 问题：图片不显示

**可能原因**：
- 图片路径错误
- Next.js 图片优化配置问题

**解决方案**：
1. **检查图片路径**
   - 使用相对路径：`/images/logo.png`
   - 不要使用绝对路径

2. **检查 next.config.ts**
   ```typescript
   images: {
     unoptimized: true,
   }
   ```

3. **使用 `<img>` 标签而不是 `<Image>`**
   - 静态导出模式下推荐使用普通 `<img>` 标签

---

## 测试运行问题

### 问题：前端测试失败

**错误信息**：
```
FAIL tests/xxx.test.tsx
```

**解决方案**：
1. **查看具体错误信息**
   ```bash
   npm test -- --reporter=verbose
   ```

2. **更新测试快照**
   ```bash
   npm test -- -u
   ```

3. **单独运行失败的测试**
   ```bash
   npm test -- tests/xxx.test.tsx
   ```

### 问题：后端测试失败

**错误信息**：
```
FAILED tests/test_xxx.py
```

**解决方案**：
1. **查看详细错误信息**
   ```bash
   python -m pytest -v
   ```

2. **单独运行失败的测试**
   ```bash
   python -m pytest tests/test_xxx.py
   ```

3. **检查测试环境配置**
   - 确认虚拟环境已激活
   - 确认所有依赖已安装

---

## 性能问题

### 问题：页面加载缓慢

**可能原因**：
- 网络请求过多
- 图片未优化
- JavaScript 包过大

**解决方案**：
1. **使用浏览器性能分析工具**
   - F12 > Lighthouse
   - 运行性能分析

2. **优化图片**
   - 压缩图片大小
   - 使用 WebP 格式

3. **检查网络请求**
   - F12 > Network
   - 查看慢请求并优化

### 问题：API 响应缓慢

**可能原因**：
- 数据库查询未优化
- 缺少索引
- 网络延迟

**解决方案**：
1. **查看后端日志**
   - 找出慢查询

2. **添加数据库索引**
   - 在 `database-init.sql` 中已包含常用索引

3. **使用数据库查询分析**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM users WHERE phone = '13800138000';
   ```

---

## 🆘 仍然无法解决？

如果以上方案都无法解决你的问题：

1. **查看详细文档**
   - `docs/03-tutorials/LOCAL_TESTING_GUIDE.md`
   - `README.md`

2. **搜索已有 Issues**
   - 在项目 GitHub 仓库搜索类似问题

3. **提交新 Issue**
   - 描述问题现象
   - 提供错误信息
   - 说明操作步骤
   - 附上环境信息（Node.js 版本、Python 版本、操作系统等）

4. **联系开发团队**
   - 通过项目 Issue 系统反馈

---

**提示**：大多数问题都可以通过以下步骤解决：
1. 重启服务
2. 清除缓存
3. 重新安装依赖
4. 检查配置文件

**记住**：遇到问题不要慌，仔细阅读错误信息，通常错误信息会告诉你问题所在。

祝你调试顺利！🎉
