$ErrorActionPreference = "Stop"

Write-Host "Preparando Dashboard CDIC-BR..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js não encontrado. Instale Node.js 20 LTS ou 22 LTS e abra um novo PowerShell."
}

$nodeVersion = node --version
Write-Host "Node: $nodeVersion"

if (Test-Path ".next") { Remove-Item ".next" -Recurse -Force }
if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
if (Test-Path "tsconfig.tsbuildinfo") { Remove-Item "tsconfig.tsbuildinfo" -Force }

Write-Host "Instalando dependências com npm ci..." -ForegroundColor Cyan
& npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci falhou." }

Write-Host "Executando validação TypeScript..." -ForegroundColor Cyan
& npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Typecheck falhou." }

if (-not (Test-Path ".env.local")) {
  Write-Host "Agora configure o Trello." -ForegroundColor Yellow
  & .\CONFIGURAR_TRELLO.ps1
}

Write-Host "Pronto. Execute npm run dev" -ForegroundColor Green
