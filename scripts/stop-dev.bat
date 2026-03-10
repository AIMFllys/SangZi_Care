@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════╗
echo ║     桑梓智护 - 停止开发服务工具     ║
echo ╚════════════════════════════════════════╝
echo.

echo [正在停止服务...]
echo.

REM 停止前端服务 (端口 3000)
echo 📱 停止前端服务 (端口 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo    正在终止进程 %%a...
    taskkill /F /PID %%a >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo    ✓ 前端服务已停止
    ) else (
        echo    ⚠ 无法停止进程 %%a
    )
)

REM 停止后端服务 (端口 8000)
echo 🔧 停止后端服务 (端口 8000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo    正在终止进程 %%a...
    taskkill /F /PID %%a >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo    ✓ 后端服务已停止
    ) else (
        echo    ⚠ 无法停止进程 %%a
    )
)

echo.
echo ════════════════════════════════════════
echo ✅ 服务停止完成
echo ════════════════════════════════════════
echo.
pause
