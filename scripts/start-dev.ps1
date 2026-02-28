# 桑梓智护 - 本地开发环境启动脚本 (PowerShell)
# 此脚本会同时启动前端和后端服务

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "桑梓智护 - 本地开发环境启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "[1/4] 检查环境..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未找到 Node.js，请先安装 Node.js 18+" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 检查 Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未找到 Python，请先安装 Python 3.9+" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host "Node.js 版本:" -ForegroundColor Green
node --version
Write-Host "Python 版本:" -ForegroundColor Green
python --version
Write-Host ""

# 检查依赖
Write-Host "[2/4] 检查依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "前端依赖未安装，正在安装..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 前端依赖安装失败" -ForegroundColor Red
        Read-Host "按任意键退出"
        exit 1
    }
} else {
    Write-Host "前端依赖已安装 ✓" -ForegroundColor Green
}

if (-not (Test-Path "backend\venv")) {
    Write-Host "后端虚拟环境未创建，正在创建..." -ForegroundColor Yellow
    Set-Location backend
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 后端依赖安装失败" -ForegroundColor Red
        Read-Host "按任意键退出"
        exit 1
    }
    Set-Location ..
} else {
    Write-Host "后端虚拟环境已创建 ✓" -ForegroundColor Green
}
Write-Host ""

# 检查配置
Write-Host "[3/4] 检查配置..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "[警告] 未找到 .env 文件" -ForegroundColor Red
    Write-Host "请确保项目根目录有 .env 文件" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}
Write-Host "配置文件已就绪 ✓" -ForegroundColor Green
Write-Host ""

# 启动服务
Write-Host "[4/4] 启动服务..." -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "正在启动后端服务 (端口 8000)..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload --host 127.0.0.1 --port 8000" -WindowStyle Normal

# 等待后端启动
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "正在启动前端服务 (端口 3000)..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "服务启动完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "前端地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "后端地址: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键打开浏览器..." -ForegroundColor Yellow
Read-Host

Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "提示: 关闭此窗口不会停止服务" -ForegroundColor Yellow
Write-Host "要停止服务，请关闭对应的 PowerShell 窗口" -ForegroundColor Yellow
Write-Host ""
Read-Host "按任意键退出"
