# ==============================================================================
# FIRASA (فراسة) — Windows 11 One-Click Terminal Launcher
# Launches FastAPI Backend (Port 8000) and Next.js Frontend (Port 3000)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   FIRASA // فراسة — AI-Powered Market Intelligence" -ForegroundColor Yellow
Write-Host "   Launching Backend & Frontend Services on Windows 11..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $RootPath "backend"
$FrontendPath = Join-Path $RootPath "frontend"
$PythonExe = Join-Path $BackendPath ".venv\Scripts\python.exe"

# 1. Verify Backend Virtual Environment
if (-not (Test-Path $PythonExe)) {
    Write-Host "[!] Virtual environment not detected at $PythonExe" -ForegroundColor Red
    Write-Host "    Attempting to fallback to system python..." -ForegroundColor Yellow
    $PythonExe = "python"
}

# 2. Launch FastAPI Backend
Write-Host "[+] Starting FastAPI backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendPath'; & '$PythonExe' -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# 3. Launch Next.js Frontend
Write-Host "[+] Starting Next.js frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FrontendPath'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  FIRASA IS RUNNING:" -ForegroundColor Green
Write-Host "  - UI Terminal:      http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend API:      http://localhost:8000/api/v1" -ForegroundColor White
Write-Host "  - Interactive Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
