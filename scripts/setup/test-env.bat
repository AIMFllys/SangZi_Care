@echo off
chcp 65001 >nul

echo.
echo ╔════════════════════════════════════════╗
echo ║     桑梓智护 - 环境测试工具         ║
echo ╚════════════════════════════════════════╝
echo.

echo [测试开发环境]
echo.

REM 测试 Node.js
echo 1. Node.js 环境:
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node --version
    echo    ✓ Node.js 可用
) else (
    echo    ✗ Node.js 未安装
)
echo.

REM 测试 Python
echo 2. Python 环境:
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python --version
    echo    ✓ Python 可用
) else (
    echo    ✗ Python 未安装
)
echo.

REM 测试前端依赖
echo 3. 前端依赖:
if exist "node_modules\" (
    echo    ✓ node_modules 已安装
) else (
    echo    ✗ node_modules 未安装
    echo    运行: npm install
)
echo.

REM 测试配置文件
echo 4. 配置文件:
if exist ".env" (
    echo    ✓ .env 文件存在
) else (
    echo    ✗ .env 文件不存在
)
echo.

REM 测试端口占用
echo 5. 端口状态:
netstat -ano | findstr ":7742" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ⚠ 端口 7742 已被占用
) else (
    echo    ✓ 端口 7742 可用
)
echo.

echo ════════════════════════════════════════
echo 测试完成
echo ════════════════════════════════════════
echo.
pause
