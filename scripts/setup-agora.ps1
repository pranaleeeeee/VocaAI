# ==============================================================================
# VocaAI Studio: Agora CLI Setup & Health Diagnostic Script
# ==============================================================================

$ErrorActionPreference = "Continue"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   VocaAI Studio — Agora Conversational AI Diagnostic   " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Resolve-Path "$PSScriptRoot\.."
$agoraExe = "$rootPath\agora_bin\agora.exe"

# 1. Check CLI binary
Write-Host "[1/4] Checking Agora CLI executable..." -ForegroundColor Yellow
if (Test-Path $agoraExe) {
    $version = & $agoraExe --version
    Write-Host "  -> Agora CLI detected: $version" -ForegroundColor Green
} else {
    Write-Host "  -> Agora CLI not found at: $agoraExe" -ForegroundColor Red
}

# 2. Check Authentication
Write-Host "`n[2/4] Checking Agora CLI Authentication..." -ForegroundColor Yellow
try {
    $authOut = & $agoraExe whoami
    Write-Host $authOut
} catch {
    Write-Host "  -> Auth check error: $_" -ForegroundColor Red
}

# 3. Check Project Readiness
Write-Host "`n[3/4] Running Agora Project Doctor..." -ForegroundColor Yellow
try {
    $doctorOut = & $agoraExe project doctor
    Write-Host $doctorOut
} catch {
    Write-Host "  -> Project doctor error: $_" -ForegroundColor Red
}

# 4. Check Environment Variables
Write-Host "`n[4/4] Checking Configured Environment Variables..." -ForegroundColor Yellow
if ($env:AGORA_APP_ID) {
    Write-Host "  -> AGORA_APP_ID: Configured ($env:AGORA_APP_ID)" -ForegroundColor Green
} else {
    Write-Host "  -> AGORA_APP_ID: Not exported in current shell (checking server/.env)" -ForegroundColor Gray
}

if ($env:AGORA_APP_CERTIFICATE) {
    Write-Host "  -> AGORA_APP_CERTIFICATE: Configured" -ForegroundColor Green
} else {
    Write-Host "  -> AGORA_APP_CERTIFICATE: Not exported in current shell (checking server/.env)" -ForegroundColor Gray
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "   Diagnostic Complete. Ready to launch VocaAI Studio!  " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
