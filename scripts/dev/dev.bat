@echo off
chcp 65001 >nul
setlocal EnableExtensions
set "REPO_ROOT=%~dp0..\.."
cd /d "%REPO_ROOT%"

title 桑梓智护 - 开发环境启动
echo.
echo ========================================
echo 桑梓智护 - 本地开发环境
echo ========================================

where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请安装 Node.js 22.x
    exit /b 1
)

call node scripts\check-node-version.mjs
if errorlevel 1 exit /b 1

if not exist "node_modules\" (
    echo [准备] 正在使用 npm install 安装依赖...
    call npm install
    if errorlevel 1 exit /b 1
)

if not exist ".env.local" (
    echo [错误] 未找到 .env.local
    echo 请复制 .env.example，并只在本地填写真实密钥
    exit /b 1
)

echo [启动] http://localhost:7742
start "桑梓智护 - Next.js 7742" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

curl --fail --silent http://localhost:7742/api/ping >nul 2>nul
if errorlevel 1 (
    echo [提示] 服务仍在启动，请稍后访问 http://localhost:7742/api/ping
) else (
    echo [正常] Next.js 页面与同源 API 已启动
)

choice /C YN /M "是否打开应用"
if errorlevel 2 exit /b 0
start "" http://localhost:7742
exit /b 0
