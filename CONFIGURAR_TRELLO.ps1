$ErrorActionPreference = "Stop"

Write-Host "=== CDIC-BR - configurar Trello ===" -ForegroundColor Cyan
if (-not (Test-Path ".\package.json")) {
  throw "Execute este script na pasta raiz do projeto."
}

$boardId = Read-Host "Board ID/shortLink [KaACdOVE]"
if ([string]::IsNullOrWhiteSpace($boardId)) { $boardId = "KaACdOVE" }

$apiKey = Read-Host "TRELLO_API_KEY"
if ([string]::IsNullOrWhiteSpace($apiKey)) { throw "A API Key é obrigatória." }

$secureToken = Read-Host "TRELLO_TOKEN (não será exibido)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
if ([string]::IsNullOrWhiteSpace($token)) { throw "O token é obrigatório." }

$content = @"
TRELLO_MODE=trello
TRELLO_BOARD_ID=$boardId
TRELLO_API_KEY=$apiKey
TRELLO_TOKEN=$token
DASHBOARD_WRITE_SECRET=
"@
Set-Content -Path ".\.env.local" -Value $content -Encoding UTF8

Write-Host ".env.local criado. Ele está ignorado pelo Git." -ForegroundColor Green
Write-Host "Agora execute: npm run dev" -ForegroundColor Green
