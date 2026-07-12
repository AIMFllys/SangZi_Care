@echo off
chcp 65001 >nul
REM Sangzi Smart Care - Local Development Startup Script

echo ========================================
echo Sangzi Smart Care - Starting Development Environment
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js 22.x
    pause
    exit /b 1
)

echo [1/3] Checking environment...
echo Node.js version:
node --version
echo.

echo [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Dependency installation failed
        pause
        exit /b 1
    )
) else (
    echo Dependencies installed
)
echo.

echo [3/3] Checking configuration...
if not exist ".env.local" (
    if not exist ".env" (
        echo [WARNING] .env.local not found
        echo Please copy .env.example to .env.local and fill in keys
        pause
        exit /b 1
    )
)
echo Configuration file ready
echo.

echo ========================================
echo Starting Next.js dev server (port 7742)...
echo ========================================
start "Sangzi Smart Care - Dev" cmd /k "npm run dev"

echo.
echo ========================================
echo Service started successfully!
echo ========================================
echo.
echo App:      http://localhost:7742
echo Probe:    http://localhost:7742/api/ping
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:7742

echo.
echo Note: Closing this window will not stop the service.
echo To stop, close the "Sangzi Smart Care - Dev" window or press Ctrl+C.
echo.
pause
