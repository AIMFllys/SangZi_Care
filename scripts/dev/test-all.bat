@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
set "REPO_ROOT=%~dp0..\.."
cd /d "%REPO_ROOT%"
set "TOTAL_ERRORS=0"

echo ========================================
echo 桑梓智护 - Web 交付门禁
echo ========================================

echo [1/4] npm test
call npm test
if errorlevel 1 set /a TOTAL_ERRORS+=1

echo [2/4] npm run lint
call npm run lint
if errorlevel 1 set /a TOTAL_ERRORS+=1

echo [3/4] npm run tsc
call npm run tsc
if errorlevel 1 set /a TOTAL_ERRORS+=1

echo [4/4] npm run build
call npm run build
if errorlevel 1 set /a TOTAL_ERRORS+=1

if !TOTAL_ERRORS! GTR 0 (
    echo [失败] !TOTAL_ERRORS! 个交付门禁未通过
    exit /b 1
)

echo [成功] 测试、Lint、类型检查与生产构建全部通过
exit /b 0
