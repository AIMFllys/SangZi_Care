@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ========================================
echo 桑梓智护 - 停止 Next.js 7742 服务
echo ========================================

set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7742" ^| findstr "LISTENING"') do (
    set "FOUND=1"
    echo 正在终止监听 7742 端口的进程 %%a...
    taskkill /PID %%a >nul 2>nul
    if errorlevel 1 (
        echo [错误] 无法终止进程 %%a
        exit /b 1
    )
)

if "!FOUND!"=="0" echo [提示] 7742 端口没有运行中的服务
if "!FOUND!"=="1" echo [完成] 本地 Next.js 服务已停止
exit /b 0
