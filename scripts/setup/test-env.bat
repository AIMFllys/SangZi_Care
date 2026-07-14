@echo off
chcp 65001 >nul
setlocal
set "REPO_ROOT=%~dp0..\.."
cd /d "%REPO_ROOT%"

echo.
echo ========================================
echo 桑梓智护 - 本地环境检查
echo ========================================

where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Node.js
    exit /b 1
)

call node scripts\check-node-version.mjs
if errorlevel 1 exit /b 1

where npm >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 npm
    exit /b 1
)

if not exist "package-lock.json" (
    echo [错误] 缺少 package-lock.json
    exit /b 1
)

if not exist "node_modules\" (
    echo [提示] 尚未安装依赖，请运行 npm install
) else (
    echo [正常] node_modules 已存在
)

if not exist ".env.local" (
    echo [提示] 缺少 .env.local；页面可构建，但登录、AI 与语音服务不可用
    echo 请复制 .env.example，并在本地填写真实值
) else (
    echo [正常] .env.local 已存在且不会提交到 Git
)

netstat -ano | findstr ":7742" | findstr "LISTENING" >nul 2>nul
if errorlevel 1 (
    echo [正常] 7742 端口当前可用于开发服务
) else (
    echo [提示] 7742 端口已有服务监听
)

echo [完成] 当前项目只需要 Node.js + npm 单进程工具链
exit /b 0
