# Diagnóstico do erro MODULE_NOT_FOUND

O ZIP original continha uma instalação incompleta do Next.js.

Arquivo ausente identificado:

`node_modules/next/dist/server/lib/start-server.js`

Os arquivos `start-server.d.ts` e `start-server.js.map` estavam presentes, mas o JavaScript executável não.
Por isso `next dev` encerrava com `MODULE_NOT_FOUND` e o localhost era derrubado.

## Como instalar

1. Prefira uma pasta fora do OneDrive, por exemplo `C:\dev\cdic-dashboard`.
2. Abra PowerShell nessa pasta.
3. Rode:

```powershell
.\SETUP_WINDOWS.ps1
```

Se a execução de scripts estiver bloqueada, use:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\SETUP_WINDOWS.ps1
```

Ou manualmente:

```powershell
npm cache verify
npm ci
Test-Path .\node_modules\next\dist\server\lib\start-server.js
npm run dev
```

O comando `Test-Path` precisa retornar `True` antes do `npm run dev`.
