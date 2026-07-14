@echo off
chcp 65001 >nul
setlocal
set "REPO_ROOT=%~dp0..\.."
cd /d "%REPO_ROOT%"

echo.
echo ========================================
echo 桑梓智护 - Next.js 服务状态
echo ========================================
echo.

netstat -ano | findstr ":7742" | findstr "LISTENING" >nul 2>nul
if errorlevel 1 (
    echo [未运行] 本地服务未监听 7742 端口
    echo 请运行 scripts\dev\dev.bat 或 npm run dev
    exit /b 1
)

echo [运行中] 本地服务正在监听 7742 端口
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7742" ^| findstr "LISTENING"') do echo 进程 ID: %%a

curl --fail --silent --show-error http://localhost:7742/api/ping >nul
if errorlevel 1 (
    echo [异常] 端口已监听，但 Next.js 探针不可用
    exit /b 1
)

echo [正常] http://localhost:7742/api/ping
exit /b 0
