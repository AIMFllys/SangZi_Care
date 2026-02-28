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
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

echo [1/4] Checking environment...
echo Node.js version:
node --version
echo Python version:
python --version
echo.

echo [2/4] Checking dependencies...
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Frontend dependency installation failed
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies installed
)

if not exist "backend\venv\" (
    echo Creating backend virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Backend dependency installation failed
        pause
        exit /b 1
    )
    cd ..
) else (
    echo Backend virtual environment created
)
echo.

echo [3/4] Checking configuration...
if not exist ".env" (
    echo [WARNING] .env file not found
    echo Please ensure .env file exists in project root
    pause
    exit /b 1
)
echo Configuration file ready
echo.

echo [4/4] Starting services...
echo.
echo ========================================
echo Starting backend service (port 8000)...
echo ========================================
start "Sangzi Smart Care - Backend" cmd /k "cd backend && venv\Scripts\activate.bat && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Starting frontend service (port 3000)...
echo ========================================
start "Sangzi Smart Care - Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Services started successfully!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:3000

echo.
echo Note: Closing this window will not stop the services
echo To stop services, close the corresponding command windows
echo.
pause
