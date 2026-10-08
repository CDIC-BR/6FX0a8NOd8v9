$ErrorActionPreference = "Stop"
Write-Host "Configuração local do Trello para o Dashboard CDIC-BR" -ForegroundColor Cyan

$key = Read-Host "TRELLO_API_KEY"
$secureToken = Read-Host "TRELLO_TOKEN" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
$board = Read-Host "TRELLO_BOARD_ID [KaACdOVE]"
if ([string]::IsNullOrWhiteSpace($board)) { $board = "KaACdOVE" }

$content = @"
TRELLO_API_KEY=$key
TRELLO_TOKEN=$token
TRELLO_BOARD_ID=$board
HOMOLOGACAO_COMPLETA_ENABLED=false
"@
Set-Content -Path ".env.local" -Value $content -Encoding UTF8
Write-Host ".env.local criado. Execute: npm run dev" -ForegroundColor Green
