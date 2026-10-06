# CDIC-BR · Painel de Acompanhamento

Dashboard em **Next.js + TypeScript + Apache ECharts**, preparado para usar um **Trello já existente** como fonte das macroetapas e complementar, quando necessário, informações que não estão no board com um arquivo manual.

## Hierarquia do processo

O painel considera estas macroetapas, nesta ordem:

1. **Dioceses selecionadas** — dioceses definidas para participação no processo.
2. **Em diálogo** — contato e articulação em andamento.
3. **Dados recebidos** — dioceses que já enviaram os dados solicitados; o envio pode ser parcial.
4. **Dados carregados** — dados recebidos e carregados/importados no sistema.
5. **Homologação estrutural** — usuários ativos, uso contínuo, estrutura validada e instituições cadastradas/confirmadas.
6. **Homologação completa** — homologação estrutural concluída + cadastro e validação dos dados de pessoas.

Na visão principal, os seis cards formam um **fluxo de evolução com setas**. No desktop, as setas seguem da esquerda para a direita. Em telas pequenas, os cards são empilhados e as setas passam a apontar para baixo.

## Como usar com o Trello que já existe

**Não é necessário criar um novo board, renomear listas ou recriar informações.**

O fluxo recomendado é:

1. conectar o board existente;
2. informar ao projeto quais listas atuais correspondem às seis macroetapas;
3. deixar o Trello como fonte principal para a etapa atual de cada diocese;
4. aproveitar campos personalizados e checklists que já existam quando seus nomes forem reconhecidos;
5. complementar somente o que estiver ausente usando `data/manual-overrides.json`.

### 1. Mapear os nomes das listas existentes

Abra:

```text
data/trello-list-map.json
```

E coloque os nomes reais das listas do seu board na etapa correspondente. Exemplo:

```json
{
  "selecionadas": ["Piloto selecionado"],
  "dialogo": ["Contato com dioceses", "Aguardando termo"],
  "recebidos": ["Planilhas recebidas"],
  "carregados": ["Importado no CDIC"],
  "homologacaoEstrutural": ["Validação estrutural"],
  "homologacaoCompleta": ["Concluído"]
}
```

Você pode informar mais de um nome para uma mesma macroetapa. Isso permite manter o fluxo atual do Trello.

O projeto também continua reconhecendo automaticamente nomes como `Em diálogo`, `Dados recebidos`, `Dados carregados`, `Homologação estrutural` etc.

## Complemento manual de informações ausentes

Use:

```text
data/manual-overrides.json
```

O arquivo começa vazio. Há um modelo preenchido em:

```text
data/manual-overrides.example.json
```

Você pode complementar uma diocese pelo **ID do card** ou pelo **nome exato do card**.

Exemplo:

```json
{
  "dioceses": [
    {
      "nome": "Diocese de Exemplo",
      "regional": "Sul 2",
      "provincia": "Paraná",
      "dados": {
        "estrutura": 100,
        "curia": 100,
        "igrejas": 80,
        "tribunais": 40,
        "outras": 60,
        "fieis": 0
      },
      "dialogo": {
        "termoEnviado": true,
        "termoAssinado": true,
        "chanceler": true,
        "equipe": false
      }
    }
  ],
  "evolution": []
}
```

### Prioridade das fontes

O projeto segue esta regra:

```text
Macroetapa atual       → Trello (lista do card)
Campo existente        → Trello
Campo ausente          → complemento manual
Sem informação nos dois→ valor vazio/zero
```

Assim, o arquivo manual **não substitui uma informação que já existe no Trello**. Ele funciona como fallback.

### Regional e Província

Se o board já possuir Custom Fields chamados `Regional` e `Província` (ou variações reconhecidas), o painel tenta lê-los automaticamente.

Se não existirem, informe os valores no complemento manual.

## Dados intermediários

O painel trabalha com os seguintes tipos de dado:

- Estrutura organizacional
- Cúria
- Igrejas
- Tribunais e câmaras
- Outras instituições
- Fiéis

Se existirem Custom Fields numéricos no Trello com esses nomes, seus valores são utilizados automaticamente. Os valores devem estar entre `0` e `100`.

Se esses campos não existirem no board, **não é obrigatório criá-los**. Os percentuais podem ser fornecidos em `manual-overrides.json`.

Fiéis não recebe destaque isolado no dashboard principal; é uma das dimensões do conjunto de dados e ganha relevância para a homologação completa.

## Marcos de “Em diálogo”

O projeto procura um checklist com nomes como:

- `Em diálogo`
- `Adesão e articulação`
- `Contato inicial`

E procura os itens:

- Termo enviado
- Termo assinado
- Contato com o chanceler
- Contato com a equipe

Se seu Trello já usa outra estrutura ou não contém esses itens, você pode informar esses quatro valores manualmente no arquivo de complemento.

## Histórico para o gráfico de evolução

O Trello fornece a fotografia atual do board. Para exibir uma curva de crescimento anterior à conexão do painel, você pode acrescentar pontos históricos em `manual-overrides.json`:

```json
{
  "evolution": [
    {
      "label": "Ago/2026",
      "recebidos": 20,
      "carregados": 13,
      "homologacaoEstrutural": 7,
      "homologacaoCompleta": 3
    },
    {
      "label": "Set/2026",
      "recebidos": 23,
      "carregados": 16,
      "homologacaoEstrutural": 9,
      "homologacaoCompleta": 5
    }
  ]
}
```

O ponto atual é acrescentado pelo sistema a partir do Trello.

## O que existe no protótipo

- seis cards de macroetapas em ordem de evolução;
- setas horizontais no desktop e verticais no mobile;
- layout responsivo, com cards empilhados em telas pequenas;
- donut **Dioceses por etapa**, sem dupla contagem entre fatias;
- gráfico de evolução de Dados recebidos, Dados carregados, Homologação estrutural e Homologação completa;
- gráfico de completude média considerando todos os tipos de dado;
- tooltips explicativos;
- drill-down de cada etapa;
- detalhe individual da diocese em drawer;
- filtros por regional e etapa atual;
- busca de diocese;
- menu lateral recolhível;
- navegação para Painel, Dioceses e Etapas;
- Sincronização e Configurações exibem toast de área em construção;
- atualização manual e automática a cada 1 hora enquanto o painel estiver aberto;
- modo mock para teste sem Trello;
- integração híbrida Trello + complemento manual;
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

Abra:

```text
http://localhost:3000
```

## Testar sem Trello

Mantenha:

```env
TRELLO_MODE=mock
```

## Conectar ao board real

No `.env.local`:

```env
TRELLO_MODE=trello
TRELLO_API_KEY=
TRELLO_TOKEN=
TRELLO_BOARD_ID=
DASHBOARD_WRITE_SECRET=
```

Não coloque `TRELLO_TOKEN` em arquivos versionados ou públicos.

### O que você precisa levantar do seu Trello

Para adaptar o board existente ao painel, basta ter:

- URL ou ID/shortLink do board;
- nomes exatos das listas que representam o fluxo atual;
- indicação de qual lista corresponde a cada uma das seis macroetapas;
- nomes dos Custom Fields que já existem, se houver;
- nomes dos checklists/itens relevantes, se houver;
- qualquer informação que não esteja no Trello e que você queira exibir no painel.

Você não precisa compartilhar a API Key ou Token para que o código seja ajustado. Essas credenciais devem ser inseridas apenas no seu `.env.local` e depois nas variáveis protegidas da Vercel.

## Edição pelo dashboard

A escrita no Trello é opcional e fica protegida por:

```env
DASHBOARD_WRITE_SECRET=
```

O dashboard só consegue gravar uma informação se houver um Custom Field ou item de checklist correspondente no Trello. Se a informação existir apenas no complemento manual, o painel avisará que ela deve ser alterada em `data/manual-overrides.json`.

> Observação: como `manual-overrides.json` faz parte do código, uma alteração nesse arquivo exige novo deploy na Vercel. Se for necessário editar esses dados manualmente com frequência sem redeploy, a próxima evolução recomendada é uma pequena área administrativa com armazenamento persistente.

## Menu lateral

- **Painel**: volta ao topo.
- **Dioceses**: navega para a tabela e drill-down individual.
- **Etapas**: navega para o fluxo de evolução.
- **Sincronização**: em construção; proposta: conexão com Trello, última sincronização, mapeamento e erros.
- **Configurações**: em construção; proposta: parametrização das listas, campos, checklist e frequência de atualização.

A área **Relatórios** permanece removida.

## Logo e ícone da aba

O projeto usa:

```text
public/logo.svg
```

para o menu lateral e para o favicon. Substitua o arquivo mantendo o mesmo nome.

## Vercel

O projeto pode ser publicado diretamente na Vercel. Cadastre as mesmas variáveis do `.env.local` em **Project Settings → Environment Variables**.

Se o repositório for público, evite colocar informações internas ou sensíveis no arquivo manual. Para uso institucional, prefira um repositório privado.
