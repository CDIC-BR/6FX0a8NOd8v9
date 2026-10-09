# CDIC-BR — Dashboard de acompanhamento das dioceses

Projeto Next.js + TypeScript preparado para:

- execução local no Windows;
- versionamento no GitHub;
- deploy na Vercel;
- leitura server-side da API do Trello;
- fallback para snapshot quando o Trello estiver indisponível.

## Importante: versão corrigida

Esta entrega possui o identificador de código:

```text
2026-10-08-clean-1
```

Depois de publicar, abra:

```text
/api/health
```

O JSON precisa conter:

```json
{
  "appVersion": "2026-10-08-clean-1"
}
```

Se esse valor não aparecer, você está acessando um deployment antigo, outro projeto da Vercel ou outra branch.

## Variáveis de ambiente

Use:

```env
TRELLO_MODE=trello
TRELLO_API_KEY=SUA_CHAVE
TRELLO_TOKEN=SEU_TOKEN
TRELLO_BOARD_ID=KaACdOVE
HOMOLOGACAO_COMPLETA_ENABLED=false
```

`TRELLO_MODE` é aceito por compatibilidade, mas não é mais obrigatório. Se ele estiver ausente e `TRELLO_API_KEY` + `TRELLO_TOKEN` estiverem configurados, a aplicação tenta o Trello normalmente.

Valores `snapshot`, `mock`, `off` ou `disabled` em `TRELLO_MODE` desativam a consulta ao Trello.

## Rodar localmente — caminho recomendado

Requisitos:

- Windows PowerShell;
- Node.js 20 LTS ou 22 LTS;
- npm disponível no terminal.

Descompacte o projeto em uma pasta simples, por exemplo:

```text
C:\dev\cdic-dashboard
```

Evite executar a partir de dentro do ZIP ou de uma pasta contendo `node_modules` copiado de outro computador.

No PowerShell, dentro da pasta do projeto:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\SETUP_WINDOWS.ps1
```

O script:

1. remove `.next`, `node_modules` e cache TypeScript antigos;
2. executa `npm ci` usando o `package-lock.json`;
3. executa `npm run typecheck`;
4. chama o configurador do Trello se `.env.local` ainda não existir.

Depois:

```powershell
npm run dev
```

Abra:

```text
http://localhost:3000
```

### Diagnóstico local

Primeiro:

```text
http://localhost:3000/api/health
```

Esperado:

```json
{
  "ok": true,
  "appVersion": "2026-10-08-clean-1",
  "environment": "local",
  "trelloMode": "trello",
  "apiKeyConfigured": true,
  "tokenConfigured": true,
  "boardId": "KaACdOVE"
}
```

Depois:

```text
http://localhost:3000/api/trello/status
```

Para conexão ao vivo, procure:

```json
{
  "ok": true,
  "source": "trello"
}
```

Se `source` for `snapshot`, leia `warning`. O endpoint nunca exibe a chave ou o token.

## GitHub

O repositório deve ter `package.json` na raiz.

Estrutura correta:

```text
repo/
  app/
  components/
  data/
  lib/
  public/
  package.json
  package-lock.json
  tsconfig.json
  ...
```

Evite isto:

```text
repo/
  cdic-dashboard-vercel-corrigido/
    package.json
```

Se optar por manter uma subpasta, configure essa subpasta como **Root Directory** na Vercel.

Antes do primeiro commit:

```powershell
git status
```

Não devem ser enviados:

```text
.env.local
.env
node_modules/
.next/
.vercel/
tsconfig.tsbuildinfo
```

Comandos típicos:

```powershell
git init
git add .
git commit -m "Dashboard CDIC-BR - integração Trello"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

## Vercel

### 1. Importar o repositório

Na Vercel:

1. Add New > Project;
2. importe o repositório correto;
3. confirme que **Framework Preset = Next.js**;
4. confirme que o **Root Directory** aponta para a pasta onde está o `package.json`;
5. mantenha os comandos automáticos da Vercel.

### 2. Environment Variables

Em Settings > Environment Variables, cadastre em Production e Preview:

```text
TRELLO_MODE = trello
TRELLO_API_KEY = sua chave
TRELLO_TOKEN = seu token
TRELLO_BOARD_ID = KaACdOVE
HOMOLOGACAO_COMPLETA_ENABLED = false
```

Depois das alterações, gere um **novo deployment**.

### 3. Confirmar que o deployment novo está ativo

Abra no domínio de produção:

```text
https://SEU-DOMINIO/api/health
```

Tem que aparecer:

```text
"appVersion": "2026-10-08-clean-1"
```

Se não aparecer, não é este código que está rodando. Verifique na Vercel:

- Project > Settings > Git: repositório conectado;
- Production Branch: `main`;
- Root Directory;
- Deployments: commit usado no deployment;
- domínio apontando para esse mesmo projeto.

### 4. Confirmar Trello

Abra:

```text
https://SEU-DOMINIO/api/trello/status
```

Quando tudo estiver certo:

```text
"mode": "trello"
"source": "trello"
"configuration": {
  "apiKeyConfigured": true,
  "tokenConfigured": true,
  "credentialsConfigured": true,
  "boardId": "KaACdOVE"
}
```

Se as credenciais estiverem configuradas mas `source` continuar `snapshot`, o campo `warning` informará o erro real da API do Trello.

## Regras do dashboard

- A etapa predominante é definida exclusivamente pela lista do cartão no Trello.
- `Acompanhamento` é ignorada.
- Listas oficiais:
  - Dioceses selecionadas
  - Em diálogo
  - Dados recebidos
  - Dados carregados
  - Homologação estrutural
  - Homologação completa
- Etiquetas são informações complementares e não promovem etapa.
- Regional e Província vêm da base local enquanto não existirem como Custom Fields do Trello.
- Os filtros geográficos usam a base completa de 281 circunscrições.
- `Homologação completa` permanece N/D enquanto `HOMOLOGACAO_COMPLETA_ENABLED=false`.

## Segurança

Nunca faça commit de `.env.local`.

A versão anexada anteriormente continha um `.env.local`. Esta entrega foi higienizada e não contém credenciais. Como credenciais do Trello já foram compartilhadas fora do ambiente de segredo, recomenda-se gerar um novo token antes do deploy definitivo.


## Correção dos filtros no modo escuro

Os seletores de Regional e Província possuem agora `color-scheme` e cores explícitas para `option`/`optgroup`, evitando lista branca com texto claro em Windows/Chrome.


## Listas do Trello: classificação por ID

A etapa do dashboard agora usa o **ID da lista do Trello** como referência principal. Por isso, renomear uma lista no Trello não exige novo deploy.

A lista `6ac3ff5bda22a8c77a754e09`, antes chamada **Dados carregados**, está mapeada para a etapa **Dados parciais carregados**.

O nome da lista é usado apenas como fallback de compatibilidade. A lista **Acompanhamento** continua ignorada.


## Renomear listas no Trello

A partir da versão `2026-10-08-live-list-name-3`, o ID da lista é usado apenas para manter a classificação da etapa estável. O nome exibido no dashboard vem sempre do nome atual da lista retornado pela API do Trello.

O dashboard atualiza automaticamente a cada 60 segundos, ao voltar para a aba e pelo botão Atualizar. Não é necessário novo deploy apenas para renomear uma lista existente.

Para confirmar que a leitura é ao vivo, consulte `/api/trello/status`: `source` deve ser `trello`, e `stageMapping` mostra os nomes atuais das listas.


## Ajuste de detalhamento — 2026-10-08-detail-clean-4

No drawer de detalhamento foram removidos o resumo agregado de etiquetas/termos e o bloco individual “Situação do termo”. As etiquetas do Trello permanecem exibidas em cada circunscrição e continuam sendo a fonte visual para esses substatus.
