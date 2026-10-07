$ErrorActionPreference = "Stop"

Write-Host "=== CDIC-BR Dashboard - instalação limpa ===" -ForegroundColor Cyan
Write-Host "Pasta: $PWD"

if (-not (Test-Path ".\package.json")) {
  throw "Execute este script na pasta raiz do projeto, onde está o package.json."
}

try {
  $nodeVersion = node -v
  $npmVersion = npm -v
  Write-Host "Node: $nodeVersion"
  Write-Host "npm:  $npmVersion"
} catch {
  throw "Node.js/npm não foram encontrados no PATH. Instale Node 22 LTS e abra um novo PowerShell."
}

if ($PWD.Path -match "OneDrive") {
  Write-Warning "O projeto está dentro do OneDrive. Para evitar arquivos de node_modules incompletos, prefira algo como C:\dev\cdic-dashboard."
}

Write-Host "Removendo instalações/cache locais do projeto..." -ForegroundColor Yellow
Remove-Item -Recurse -Force ".\node_modules" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".\.next" -ErrorAction SilentlyContinue
Remove-Item ".\tsconfig.tsbuildinfo" -Force -ErrorAction SilentlyContinue

Write-Host "Verificando cache do npm..." -ForegroundColor Yellow
npm cache verify

Write-Host "Instalando exatamente as versões do package-lock.json..." -ForegroundColor Yellow
npm ci

$startServer = ".\node_modules\next\dist\server\lib\start-server.js"
if (-not (Test-Path $startServer)) {
  Write-Warning "A instalação terminou, mas o arquivo start-server.js continua ausente. Tentando uma reinstalação com cache limpo..."
  Remove-Item -Recurse -Force ".\node_modules" -ErrorAction SilentlyContinue
  npm cache clean --force
  npm ci
}

if (-not (Test-Path $startServer)) {
  throw "O npm voltou a instalar o Next.js sem start-server.js. Isso aponta para interferência local (antivírus/sincronização/cache). Informe esta mensagem antes de continuar."
}

Write-Host "Dependências íntegras. Iniciando o servidor..." -ForegroundColor Green
npm run dev
