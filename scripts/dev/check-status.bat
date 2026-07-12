@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════╗
echo ║     桑梓智护 - 服务状态检查工具     ║
echo ╚════════════════════════════════════════╝
echo.

echo [检查服务状态]
echo.

REM 检查前端服务 (端口 3000)
echo 📱 前端服务 (端口 3000):
netstat -ano | findstr ":3000" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ 运行中
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        echo    进程 ID: %%a
    )
) else (
    echo    ✗ 未运行
)
echo.

REM 检查后端服务 (端口 8000)
echo 🔧 后端服务 (端口 8000):
netstat -ano | findstr ":8000" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ 运行中
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
        echo    进程 ID: %%a
    )
) else (
    echo    ✗ 未运行
)
echo.

echo ════════════════════════════════════════
echo.
echo 💡 提示:
echo    - 如需启动服务，运行: scripts\dev.bat
echo    - 如需停止服务，运行: scripts\stop-dev.bat
echo.
pause
