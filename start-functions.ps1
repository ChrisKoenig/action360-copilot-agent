#!/usr/bin/env pwsh
# Start Azure Functions for UAT Routing Agent

Write-Host "Starting Azure Functions UAT Routing Agent..." -ForegroundColor Cyan
Write-Host ""

$projectPath = "c:\Users\chkoenig\OneDrive - Microsoft\src\action360-copilot-agent"

# Check if already running
$existingProcess = Get-Process -Name "func" -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "⚠ Functions app is already running (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    $response = Read-Host "Stop and restart? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "Stopping existing process..." -ForegroundColor Yellow
        Stop-Process -Name "func" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    else {
        Write-Host "Keeping existing process running." -ForegroundColor Green
        exit 0
    }
}

# Change to project directory
Set-Location $projectPath

# Start the functions
Write-Host "Starting Functions Runtime..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Endpoints will be available at:" -ForegroundColor Green
Write-Host "  • Health Check:  http://localhost:7071/api/health" -ForegroundColor Gray
Write-Host "  • UAT Routing:   http://localhost:7071/api/uat-routing" -ForegroundColor Gray
Write-Host "  • Batch Routing: http://localhost:7071/api/uat-routing-batch" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm start
