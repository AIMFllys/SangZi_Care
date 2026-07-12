@echo off
REM 桑梓智护 - 运行所有测试

echo ========================================
echo 桑梓智护 - 运行所有测试
echo ========================================
echo.

set TOTAL_ERRORS=0

echo [1/2] 运行前端测试...
echo ========================================
call npm test
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 前端测试失败
    set /a TOTAL_ERRORS+=1
) else (
    echo [成功] 前端测试通过 ✓
)
echo.

echo [2/2] 运行后端测试...
echo ========================================
cd backend
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    python -m pytest
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 后端测试失败
        set /a TOTAL_ERRORS+=1
    ) else (
        echo [成功] 后端测试通过 ✓
    )
) else (
    echo [错误] 后端虚拟环境未找到，请先运行 start-dev.bat
    set /a TOTAL_ERRORS+=1
)
cd ..
echo.

echo ========================================
echo 测试完成
echo ========================================
if %TOTAL_ERRORS% EQU 0 (
    echo [成功] 所有测试通过！✓
) else (
    echo [失败] 有 %TOTAL_ERRORS% 个测试失败
)
echo.
pause
