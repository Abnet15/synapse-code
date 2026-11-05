# ==============================================================================
# SynapseCode SaaS - Windows PowerShell Automated Deployment Pipeline
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 SYNAPSECODE PRODUCTION DEPLOYMENT & VALIDATION PIPELINE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "`n📦 [1/3] Validating Backend Server Dependencies & Build..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\server"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing server packages..."
    npm install --silent
}
npm run build

Write-Host "`n⚛️  [2/3] Validating Frontend Client Dependencies & Build..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\client"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing client packages..."
    npm install --silent
}
npm run build

Write-Host "`n🔧 [3/3] Preparing Git Repository & Staging Files..." -ForegroundColor Yellow
Set-Location $ProjectRoot

if (-not (Test-Path ".git")) {
    git init -b main
} else {
    git branch -M main
}

git add .

$status = git status --porcelain
if ($status) {
    git commit -m "feat: complete production-ready SynapseCode SaaS with Chapa payments"
} else {
    Write-Host "Working tree clean, no new changes to commit." -ForegroundColor Green
}

$origin = git remote
if ($origin -notcontains "origin") {
    git remote add origin "https://github.com/Abnet15/synapse-code.git"
}

Write-Host "Pushing upstream to GitHub (main)..." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT READY: SynapseCode is validated and pushed!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
