# CDIC-BR — Dashboard de acompanhamento das dioceses

Projeto **Next.js + TypeScript**, pronto para execução local e publicação na **Vercel**.

O painel preserva o protótipo validado: Poppins, paleta baseada em `#077dcc`, fluxo de etapas com setas, gráfico de rosca, bloco das dioceses piloto, visão por Regional, pontos de atenção e drill-down com Diocese + Regional + Província.

## Como os dados funcionam

A aplicação usa duas fontes complementares:

1. **Trello (dinâmico)** — a lista atual define a etapa; etiquetas são usadas apenas como informações complementares, como termo assinado e identificação de piloto.
2. **`data/dioceses-meta.json` (estático)** — Regional e Província Eclesiástica, porque o board atual não possui Custom Fields para essas informações.

Quando as variáveis do Trello estão configuradas, o backend consulta a API em tempo real. Se a API estiver indisponível, o dashboard usa `data/trello-snapshot.json`, um snapshot sanitizado do JSON exportado usado na construção deste projeto.

### Regra de etapas

A **etapa atual é definida exclusivamente pela lista do cartão no Trello**. Não há promoção de etapa por etiqueta.

As listas consideradas são:

1. Dioceses selecionadas
2. Em diálogo
3. Dados recebidos
4. Dados carregados
5. Homologação estrutural
6. Homologação completa

A lista **Acompanhamento** é ignorada, assim como qualquer outra lista que não esteja no conjunto acima.

As etiquetas continuam podendo ser utilizadas como informação complementar:

- `Termo assinado` → contabiliza termo assinado, mas não altera a etapa
- `Piloto` → identifica o grupo piloto
- demais etiquetas → podem ser exibidas/consumidas como metadados, mas não mudam a etapa

Com o snapshot atual, a leitura exclusivamente pelas listas resulta em **10 Dioceses selecionadas, 15 Em diálogo, 0 Dados recebidos, 6 Dados carregados e 14 em Homologação estrutural**, totalizando 45 participantes.

A configuração está em `data/stage-rules.json`.

## Segurança

**Nenhuma credencial do Trello foi gravada no projeto.**

A chave e o token são utilizados apenas no servidor (`lib/trello.ts`) e nunca são enviados ao navegador.

O fluxo de leitura usa:

- `GET /1/boards/{boardId}`
- `GET /1/boards/{boardId}/lists`
- `GET /1/boards/{boardId}/cards`

## Rodar localmente

Recomendado: **Node.js 20 LTS ou 22 LTS**.

```powershell
npm install
Copy-Item .env.example .env.local
```

Preencha `.env.local`:

```env
TRELLO_API_KEY=SUA_CHAVE
TRELLO_TOKEN=SEU_TOKEN
TRELLO_BOARD_ID=KaACdOVE
HOMOLOGACAO_COMPLETA_ENABLED=false
```

Depois:

```powershell
npm run dev
```

Abra:

```text
http://localhost:3000
```

Diagnóstico da integração:

```text
http://localhost:3000/api/trello/status
```

Se `source` retornar `trello`, a leitura está ao vivo. Se retornar `snapshot`, veja o campo `warning`.

## Publicar na Vercel

1. Suba este projeto no GitHub.
2. Na Vercel, escolha **Add New > Project** e importe o repositório.
3. Em **Settings > Environment Variables**, crie:
   - `TRELLO_API_KEY`
   - `TRELLO_TOKEN`
   - `TRELLO_BOARD_ID` = `KaACdOVE`
   - `HOMOLOGACAO_COMPLETA_ENABLED` = `false`
4. Faça o deploy.

Não é necessário `vercel.json`: a Vercel detecta Next.js automaticamente.

## Atualização

- Ao abrir a página, o servidor consulta o Trello.
- O botão **Atualizar** força nova consulta.
- Enquanto a página estiver aberta, o navegador atualiza automaticamente a cada **1 hora**.
- As rotas de API usam `cache: no-store`.

## Circunscrições não participantes

O KPI é calculado automaticamente como:

```text
281 circunscrições totais − participantes atuais do projeto
```

Com 45 participantes, o painel exibe **236 circunscrições não participantes**.

## Regional e Província

Enquanto essas informações não estiverem no Trello, mantenha `data/dioceses-meta.json` atualizado.

Quando você criar Custom Fields para Regional e Província no Trello, a integração pode ser alterada para eliminar esse arquivo e ler tudo diretamente do board.

## Homologação completa

Enquanto o importador estiver em desenvolvimento:

```env
HOMOLOGACAO_COMPLETA_ENABLED=false
```

O painel exibirá **N/D**.

Quando a etapa puder ser mensurada, altere a variável para `true` e utilize a lista `Homologação completa` do Trello.

## Logo

Substitua:

```text
public/logo.svg
```

O arquivo é usado no menu lateral e como ícone da página.

## Interface atual

- Navegação lateral simplificada: apenas **Visão geral** nesta versão.
- Modo claro/escuro com preferência persistida no navegador e respeito à preferência do sistema no primeiro acesso.
- Tipografia ampliada nos elementos de visualização (etapas, rosca, regionais, piloto e pontos de atenção).
- Em telas móveis, o menu lateral é ocultado e o cabeçalho mantém acesso ao alternador de tema.

## Interação dos cards

Nesta versão, os indicadores e cards de análise são inteiramente clicáveis. Não há ações separadas com o texto “Ver”. Ao clicar no KPI, etapa, card de piloto, linha de Regional ou ponto de atenção, o painel lateral de detalhamento é aberto.

O KPI **Circunscrições não participantes** também possui detalhamento. A lista é calculada a partir de `data/circunscricoes-base.json` (281 circunscrições) menos as circunscrições participantes encontradas nas listas válidas do Trello. Com as 45 participantes atuais do processo CDIC-BR, o resultado é 236.

A lista `Acompanhamento` continua ignorada para classificação e contagem de participantes.

## Detalhamento por etiquetas do Trello

O drawer de detalhamento agora exibe as etiquetas reais de cada cartão do Trello como **substatus informativos**. Elas não alteram a etapa principal do dashboard: a etapa continua sendo determinada exclusivamente pela lista em que o cartão está.

No topo do detalhamento é apresentado um resumo das etiquetas encontradas no conjunto aberto. Em cada diocese são exibidos:

- situação do termo derivada das etiquetas (`Termo assinado`, `Termo enviado · não assinado` ou sem status identificado);
- etiquetas reais do Trello, preservando o nome e uma representação visual da cor;
- Regional, Província, Grupo e última atividade;
- link para abrir o cartão original no Trello.

A leitura é dinâmica: novas etiquetas recebidas pela API também são exibidas, mesmo que não estejam entre as etiquetas hoje conhecidas pelo projeto.

## Filtro do KPI de não participantes

O card **Circunscrições não participantes** responde aos filtros de **Regional** e **Província**. O cálculo exibido passa a considerar somente o universo geográfico filtrado: circunscrições da base no filtro menos participantes do processo CDIC-BR no mesmo filtro. O detalhamento do card também abre apenas as circunscrições não participantes correspondentes ao filtro ativo.

## Ajuste de interface

- Removidos os subtítulos descritivos abaixo do título principal e dos títulos das seções.
- Removida a nota visual de regra de classificação do dashboard.
- Mantidos títulos, filtros, KPIs, gráficos, cards interativos e detalhamentos.


## Filtros geográficos

Os filtros de Regional e Província são montados a partir da base completa de 281 circunscrições (participantes + não participantes), e não apenas dos cartões atualmente presentes nas etapas do Trello. Assim, todos os 19 Regionais da base permanecem disponíveis mesmo quando um Regional ainda não possui diocese participante no processo.
