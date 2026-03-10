@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ========================================
REM 桑梓智护 - 本地开发环境一键启动
REM ========================================

title 桑梓智护 - 开发环境启动

echo.
echo ╔════════════════════════════════════════╗
echo ║   桑梓智护 - 本地开发环境启动工具   ║
echo ╚════════════════════════════════════════╝
echo.

REM 检查 Node.js
echo [1/5] 检查 Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未找到 Node.js，请先安装 Node.js 18+
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js 已安装: !NODE_VERSION!

REM 检查 Python
echo [2/5] 检查 Python...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未找到 Python，请先安装 Python 3.9+
    echo    下载地址: https://www.python.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✓ Python 已安装: !PYTHON_VERSION!

REM 检查前端依赖
echo [3/5] 检查前端依赖...
if not exist "node_modules\" (
    echo ⚠ 前端依赖未安装，正在安装...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 前端依赖安装失败
        pause
        exit /b 1
    )
    echo ✓ 前端依赖安装完成
) else (
    echo ✓ 前端依赖已安装
)

REM 检查后端依赖
echo [4/5] 检查后端依赖...
if not exist "backend\venv\" (
    echo ⚠ 后端虚拟环境未创建，正在创建...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    echo 正在安装后端依赖...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 后端依赖安装失败
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo ✓ 后端虚拟环境创建完成
) else (
    echo ✓ 后端虚拟环境已创建
)

REM 检查配置文件
echo [5/5] 检查配置文件...
if not exist ".env" (
    echo ❌ 未找到 .env 文件
    echo    请确保项目根目录有 .env 文件
    pause
    exit /b 1
)
echo ✓ 配置文件已就绪

echo.
echo ════════════════════════════════════════
echo 正在启动服务...
echo ════════════════════════════════════════
echo.

REM 启动后端服务
echo 🚀 启动后端服务 (端口 8000)...
start "桑梓智护 - 后端服务" cmd /k "cd /d %~dp0..\backend && venv\Scripts\activate.bat && echo 后端服务启动中... && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

REM 等待后端启动
echo    等待后端服务启动...
timeout /t 5 /nobreak >nul

REM 启动前端服务
echo 🚀 启动前端服务 (端口 3000)...
start "桑梓智护 - 前端服务" cmd /k "cd /d %~dp0.. && echo 前端服务启动中... && npm run dev"

REM 等待前端启动
echo    等待前端服务启动...
timeout /t 3 /nobreak >nul

echo.
echo ════════════════════════════════════════
echo ✅ 服务启动完成！
echo ════════════════════════════════════════
echo.
echo 📱 前端地址: http://localhost:3000
echo 🔧 后端地址: http://localhost:8000
echo 📚 API 文档: http://localhost:8000/docs
echo.
echo 💡 提示:
echo    - 关闭此窗口不会停止服务
echo    - 要停止服务，请关闭对应的命令窗口
echo    - 或按 Ctrl+C 停止服务
echo.

REM 询问是否打开浏览器
choice /C YN /M "是否打开浏览器访问应用"
if %ERRORLEVEL% EQU 1 (
    echo 正在打开浏览器...
    start http://localhost:3000
    timeout /t 2 /nobreak >nul
    start http://localhost:8000/docs
)

echo.
echo 按任意键退出启动工具（服务将继续运行）...
pause >nul
