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
echo [1/3] 检查 Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未找到 Node.js，请先安装 Node.js 22.x
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js 已安装: !NODE_VERSION!

REM 检查前端依赖
echo [2/3] 检查前端依赖...
if not exist "node_modules\" (
    echo ⚠ 依赖未安装，正在安装...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✓ 依赖安装完成
) else (
    echo ✓ 依赖已安装
)

REM 检查配置文件
echo [3/3] 检查配置文件...
if not exist ".env.local" (
    if not exist ".env" (
        echo ❌ 未找到 .env.local 文件
        echo    请复制 .env.example 为 .env.local 并填写密钥
        pause
        exit /b 1
    )
)
echo ✓ 配置文件已就绪

echo.
echo ════════════════════════════════════════
echo 正在启动 Next.js 开发服务（端口 7742）...
echo ════════════════════════════════════════
echo.

start "桑梓智护 - 开发服务" cmd /k "cd /d %~dp0.. && echo 开发服务启动中... && npm run dev"

REM 等待服务启动
echo    等待开发服务启动...
timeout /t 5 /nobreak >nul

echo.
echo ════════════════════════════════════════
echo ✅ 服务启动完成！
echo ════════════════════════════════════════
echo.
echo 📱 应用地址: http://localhost:7742
echo 🔍 探针地址: http://localhost:7742/api/ping
echo.
echo 💡 提示:
echo    - 关闭此窗口不会停止服务
echo    - 要停止服务，请关闭「桑梓智护 - 开发服务」窗口
echo    - 或在该窗口按 Ctrl+C
echo.

REM 询问是否打开浏览器
choice /C YN /M "是否打开浏览器访问应用"
if %ERRORLEVEL% EQU 1 (
    echo 正在打开浏览器...
    start http://localhost:7742
)

echo.
echo 按任意键退出启动工具（服务将继续运行）...
pause >nul
