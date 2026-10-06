# CDIC-BR · Painel de Acompanhamento

Dashboard em **Next.js + TypeScript + Apache ECharts**, preparado para funcionar primeiro com dados simulados e depois com um board do Trello como fonte principal.

## Hierarquia do processo

O projeto considera exatamente estas macroetapas, nesta ordem:

1. **Dioceses selecionadas** — dioceses definidas para participação no processo.
2. **Em diálogo** — contato e articulação em andamento.
3. **Dados recebidos** — dioceses que já enviaram os dados solicitados; o envio pode ser parcial.
4. **Dados carregados** — dados recebidos e carregados/importados no sistema.
5. **Homologação estrutural** — usuários ativos, uso contínuo, estrutura validada e instituições cadastradas/confirmadas.
6. **Homologação completa** — homologação estrutural concluída + cadastro e validação dos dados de pessoas.

No Trello, a **lista onde o card está** representa a macroetapa atual da diocese.

## Dados intermediários

O painel também lê percentuais de completude para todos os tipos de dado:

- Estrutura organizacional
- Cúria
- Igrejas
- Tribunais e câmaras
- Outras instituições
- Fiéis

Fiéis não possui um gráfico isolado na visão principal. Ele aparece como uma dimensão do conjunto de dados e passa a ser especialmente relevante para atingir a **Homologação completa**.

### Checklist de “Em diálogo”

Use no card da diocese um checklist com um dos nomes reconhecidos pelo projeto (`Em diálogo`, `Adesão e articulação` ou `Contato inicial`) e os itens:

- Termo enviado
- Termo assinado
- Contato com o chanceler
- Contato com a equipe

O painel consolida esses marcos no drill-down da etapa **Em diálogo**.

## O que existe no protótipo

- seis cards de macroetapas, em ordem de processo;
- donut **Dioceses por etapa**, sem dupla contagem entre fatias;
- gráfico de evolução de Dados recebidos, Dados carregados, Homologação estrutural e Homologação completa;
- gráfico de completude média considerando **todos os tipos de dado**;
- tooltips explicativos;
- drill-down de cada etapa;
- detalhe individual da diocese em drawer;
- edição dos percentuais intermediários e dos marcos de diálogo;
- filtros por regional e etapa atual;
- busca de diocese;
- menu lateral recolhível;
- navegação real para Painel, Dioceses e Etapas;
- Sincronização e Configurações exibem toast informando que estão em construção e sugerindo o escopo futuro;
- atualização manual e automática a cada 1 hora enquanto o painel estiver aberto;
- modo mock para teste sem Trello;
- preparação para deploy na Vercel.

## Executar localmente

```bash
npm install
```

Crie o `.env.local` a partir do exemplo:

### Windows

```bash
copy .env.example .env.local
```

### macOS/Linux

```bash
cp .env.example .env.local
```

Depois:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Testar sem Trello

Mantenha:

```env
TRELLO_MODE=mock
```

O dashboard será preenchido com dioceses e percentuais simulados.

## Conectar ao Trello

No `.env.local`:

```env
TRELLO_MODE=trello
TRELLO_API_KEY=
TRELLO_TOKEN=
TRELLO_BOARD_ID=
DASHBOARD_WRITE_SECRET=
```

As listas do board devem usar os nomes das etapas acima. O código também aceita algumas variações/aliases definidos em `lib/config.ts`.

Os Custom Fields numéricos esperados são:

```text
Estrutura organizacional
Cúria
Igrejas
Tribunais e câmaras
Outras instituições
Fiéis
```

Preencha os valores de 0 a 100.

## Menu lateral

- **Painel**: volta ao topo.
- **Dioceses**: navega para a tabela e drill-down individual.
- **Etapas**: navega para os indicadores de processo.
- **Sincronização**: placeholder em construção; proposta de conteúdo: conexão com Trello, última sincronização, listas mapeadas e erros.
- **Configurações**: placeholder em construção; proposta: parametrização das listas, campos, checklist e frequência de atualização.

A área **Relatórios** foi removida do protótipo.

## Vercel

O projeto pode ser publicado diretamente na Vercel. Cadastre as mesmas variáveis do `.env.local` em **Project Settings → Environment Variables**.

Para apenas consultar o Trello, `DASHBOARD_WRITE_SECRET` pode ficar vazio. Para habilitar edição pelo dashboard, configure-o e adicione autenticação adequada antes do uso em produção.

## Logo e ícone da aba

O projeto usa o mesmo arquivo para a identidade visual no menu lateral e no ícone da aba do navegador:

```text
public/logo.svg
```

Substitua esse arquivo pela logo oficial mantendo o mesmo nome (`logo.svg`). Não é necessário alterar o código.

- **Menu lateral:** a imagem é carregada em `components/DashboardClient.tsx`.
- **Aba do navegador (favicon):** o Next.js usa `public/logo.svg` por meio da configuração `metadata.icons` em `app/layout.tsx`.
- Recomenda-se uma versão quadrada da logo, com boa leitura em tamanhos pequenos (idealmente 64×64 ou 128×128).

Se a logo oficial for muito horizontal, mantenha `logo.svg` como uma versão reduzida/símbolo para o favicon e ajuste o menu para usar um arquivo separado, por exemplo `logo-horizontal.svg`.
