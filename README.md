# CDIC-BR — Painel de Acompanhamento + Trello

Dashboard em **Next.js 16 + TypeScript + Apache ECharts 6**, preparado para:

- rodar localmente;
- publicar na Vercel;
- funcionar imediatamente com dados simulados;
- ler listas do Trello como **macroetapas**;
- ler Custom Fields numéricos como percentuais intermediários;
- ler checklist de **Adesão e articulação**;
- atualizar automaticamente a tela a cada 1 hora;
- mostrar donut, evolução, tooltips, drill-down e detalhe por diocese;
- permitir edição de percentuais no drawer (mock local) e possuir rota preparada para escrita no Trello.

## 1. Rodar localmente

Requer Node.js 20+ (recomendado Node.js 22).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`.

Por padrão:

```env
TRELLO_MODE=mock
```

Nenhuma credencial é necessária.

## 2. Conectar ao Trello

Edite `.env.local`:

```env
TRELLO_MODE=trello
TRELLO_API_KEY=sua_chave
TRELLO_TOKEN=seu_token
TRELLO_BOARD_ID=id_do_board
```

As credenciais são usadas **somente no servidor**. Não crie variáveis `NEXT_PUBLIC_` para chave/token.

### Listas esperadas

O arquivo `lib/config.ts` contém aliases. Os nomes principais são:

1. Dioceses selecionadas
2. Adesão e articulação
3. Estruturação inicial
4. Complementação institucional
5. Dados de Fiéis
6. Homologação final

Cada card deve representar uma diocese.

### Custom Fields esperados

Crie Custom Fields numéricos (0 a 100):

- Estrutura organizacional
- Cúria
- Igrejas
- Tribunais e câmaras
- Outras instituições
- Fiéis

O painel localiza os campos pelo **nome**, por isso os IDs não precisam ficar hardcoded.

### Checklist esperado

Nome recomendado: `Adesão e articulação`

Itens:

- Termo enviado
- Termo assinado
- Contato com o chanceler
- Contato com a equipe

## 3. Como os indicadores funcionam

### Macroetapa

É derivada da lista atual do card no Trello.

### Progresso intermediário

É derivado dos Custom Fields numéricos. Uma diocese pode, por exemplo, estar em `Dados de Fiéis` com:

- Estrutura: 100%
- Cúria: 100%
- Igrejas: 90%
- Tribunais e câmaras: 70%
- Outras instituições: 60%
- Fiéis: 55%

### Índice geral

O código usa pesos configuráveis:

- Fiéis: 50%
- Estrutura organizacional: 15%
- Cúria: 10%
- Igrejas: 10%
- Tribunais e câmaras: 7,5%
- Outras instituições: 7,5%

Os pesos medem avanço, mas **não substituem a regra de homologação final**.

## 4. Atualização automática

O navegador chama `/api/dashboard` novamente a cada **1 hora enquanto a página estiver aberta**.

Também há o botão `Atualizar agora`.

Isso permite uso no plano gratuito da Vercel sem depender de Cron horário.

## 5. Histórico / gráfico de crescimento

No modo mock há uma série temporal demonstrativa.

No modo Trello, sem armazenamento adicional, a API consegue entregar a fotografia atual. Para manter pontos diários de crescimento na Vercel, conecte futuramente um armazenamento pequeno (por exemplo, Postgres/Redis via Marketplace) ou reconstrua uma parte da linha do tempo pelas Actions do Trello.

O painel foi estruturado para receber `evolution[]` sem mudar os componentes visuais.

## 6. Edição pelo dashboard

No **modo mock**, o drawer permite alterar os percentuais durante a sessão.

Para escrever no Trello:

```env
DASHBOARD_WRITE_SECRET=um-segredo-forte
```

A rota `PUT /api/dioceses/:id` está preparada para atualizar Custom Fields numéricos. O front pede esse segredo antes de enviar uma alteração.

> Para produção, substitua esse mecanismo simples por autenticação real (SSO/login) antes de liberar edição para usuários.

Os checklists de Adesão estão sendo lidos, mas a tela de demonstração não grava os checkitems no Trello; isso foi deixado separado para evitar alterações acidentais no board real.

## 7. Deploy na Vercel

### Via GitHub

1. Crie um repositório e envie esta pasta.
2. Importe o projeto na Vercel.
3. Cadastre as mesmas variáveis de ambiente em Project Settings → Environment Variables.
4. Faça o deploy.

Não é necessário `vercel.json` para este projeto.

### Via CLI

```bash
npm i -g vercel
vercel
```

## 8. Onde personalizar

- Mapeamento Trello e pesos: `lib/config.ts`
- Mock: `lib/mock.ts`
- Consulta e transformação Trello: `lib/trello.ts`
- Dashboard / drill-down: `components/DashboardClient.tsx`
- Gráficos: `components/DashboardClient.tsx` e `components/EChart.tsx`
- Cores / layout: `app/globals.css`

A cor base usada é `#077dcc` com tons claros derivados.
