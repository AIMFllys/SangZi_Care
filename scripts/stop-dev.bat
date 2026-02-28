@echo off
REM 桑梓智护 - 停止开发服务脚本

echo ========================================
echo 桑梓智护 - 停止开发服务
echo ========================================
echo.

echo 正在查找并停止服务...
echo.

REM 停止前端服务 (Node.js)
echo [1/2] 停止前端服务 (Node.js)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo 找到进程 PID: %%a
    taskkill /PID %%a /F >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo 前端服务已停止 ✓
    )
)

REM 停止后端服务 (Python)
echo [2/2] 停止后端服务 (Python)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 找到进程 PID: %%a
    taskkill /PID %%a /F >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo 后端服务已停止 ✓
    )
)

echo.
echo ========================================
echo 所有服务已停止
echo ========================================
echo.
pause
