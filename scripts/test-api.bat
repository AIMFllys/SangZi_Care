@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════╗
echo ║     桑梓智护 - API 测试工具          ║
echo ╚════════════════════════════════════════╝
echo.

echo [测试后端 API]
echo.

REM 检查后端是否运行
echo 1. 检查后端服务状态...
netstat -ano | findstr ":8000" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo    ✗ 后端服务未运行
    echo    请先运行: scripts\dev.bat
    echo.
    pause
    exit /b 1
)
echo    ✓ 后端服务运行中
echo.

REM 测试健康检查端点
echo 2. 测试健康检查端点 (GET /health)...
curl -s http://localhost:8000/health >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ 健康检查通过
    curl -s http://localhost:8000/health
) else (
    echo    ✗ 健康检查失败
)
echo.

REM 测试 API 文档
echo 3. 测试 API 文档 (GET /docs)...
curl -s -o nul -w "%%{http_code}" http://localhost:8000/docs >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ API 文档可访问
    echo    访问: http://localhost:8000/docs
) else (
    echo    ✗ API 文档不可访问
)
echo.

echo ════════════════════════════════════════
echo 测试完成
echo ════════════════════════════════════════
echo.
echo 💡 提示:
echo    - 完整 API 文档: http://localhost:8000/docs
echo    - ReDoc 文档: http://localhost:8000/redoc
echo.
pause
