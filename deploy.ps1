#!/usr/bin/env pwsh
# deploy.ps1 — builds and deploys FieldVisit-Web to Firebase Hosting
# Run this script from PowerShell after running: firebase login
#
# Usage:
#   .\deploy.ps1               # build + deploy hosting only
#   .\deploy.ps1 -WithRules    # build + deploy hosting + firestore rules + indexes

param([switch]$WithRules)

$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot

Write-Host '🔨 Building…' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error 'Build failed'; exit 1 }

$targets = if ($WithRules) { 'hosting,firestore' } else { 'hosting' }
Write-Host "🚀 Deploying ($targets)…" -ForegroundColor Cyan
firebase deploy --only $targets

if ($LASTEXITCODE -ne 0) {
    Write-Error 'Deploy failed'
    exit 1
}

Write-Host '✅ Deploy complete!' -ForegroundColor Green
Write-Host '🌍 Live at: https://fieldvisit-8a87c.web.app' -ForegroundColor Green

Pop-Location
