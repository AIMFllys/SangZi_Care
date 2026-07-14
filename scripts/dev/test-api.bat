@echo off
chcp 65001 >nul
setlocal
set "REPO_ROOT=%~dp0..\.."
cd /d "%REPO_ROOT%"

echo.
echo ========================================
echo 桑梓智护 - Next.js 同源 API 探针
echo ========================================

where curl >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 curl
    exit /b 1
)

netstat -ano | findstr ":7742" | findstr "LISTENING" >nul 2>nul
if errorlevel 1 (
    echo [错误] 本地服务未监听 7742 端口
    echo 请先运行 npm run dev
    exit /b 1
)

echo GET http://localhost:7742/api/ping
curl --fail --silent --show-error http://localhost:7742/api/ping
if errorlevel 1 (
    echo.
    echo [失败] Next.js 同源 API 探针不可用
    exit /b 1
)

echo.
echo [成功] Next.js 同源 API 可用
exit /b 0
