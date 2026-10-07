# CDIC-BR · Painel de Acompanhamento

Dashboard Next.js + TypeScript + Apache ECharts preparado para consumir o board Trello informado e complementar apenas as informações ausentes com `data/manual-overrides.json`.

## O que foi adaptado ao Trello atual

O board já existente usa etiquetas para parte do acompanhamento. O código reconhece automaticamente, entre outras:

- `Termo enviado` → **Em diálogo** + marco Termo enviado
- `Termo assinado` → **Em diálogo** + marcos Termo enviado e Termo assinado
- `Aguardando envio da divisão territorial` → **Em diálogo**
- `Divisão recebida` → **Dados recebidos**
- `Divisão cadastrada` → **Dados carregados**

Também continuam funcionando listas do Trello, Custom Fields e checklists, quando existirem. A etapa de maior avanço reconhecida prevalece. Para Homologação estrutural e Homologação completa, os aliases podem ser ajustados em `data/trello-label-map.json` e `data/trello-list-map.json`.

## Segurança: não grave token no código

O projeto **não contém API Key nem Token**. O arquivo `.env.local` é ignorado pelo Git.

Como um token foi compartilhado durante a configuração, gere um novo token antes de publicar no GitHub ou Vercel e use somente o novo valor localmente.

## 1. Instalar

Preferencialmente use uma pasta fora do OneDrive, por exemplo `C:\dev\cdic-dashboard`.

```powershell
npm ci
```

Se quiser usar a rotina de instalação limpa:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\SETUP_WINDOWS.ps1
```

## 2. Configurar a conexão Trello

O Board ID já está preconfigurado como `KaACdOVE`.

A forma mais simples no Windows é:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\CONFIGURAR_TRELLO.ps1
```

O script solicitará API Key e Token e criará `.env.local` sem adicionar as credenciais ao código.

Ou crie manualmente `.env.local`:

```env
TRELLO_MODE=trello
TRELLO_BOARD_ID=KaACdOVE
TRELLO_API_KEY=SUA_NOVA_API_KEY
TRELLO_TOKEN=SEU_NOVO_TOKEN
DASHBOARD_WRITE_SECRET=
```

## 3. Rodar

```powershell
npm run dev
```

Abra:

- Painel: `http://localhost:3000`
- Diagnóstico seguro da conexão: `http://localhost:3000/api/trello/status`

O endpoint de diagnóstico nunca devolve a API Key ou o Token. Ele mostra apenas se a conexão funcionou, total de cards e contagens por etapa.

## 4. Como a etapa é identificada

O painel combina sinais do Trello nesta ordem:

1. `etapa` definida manualmente em `manual-overrides.json`, quando houver;
2. etiquetas reconhecidas no card;
3. lista do Trello reconhecida no mapeamento;
4. caso nenhum sinal exista, o card fica em **Dioceses selecionadas**.

Entre lista e etiqueta, o painel utiliza o estágio mais avançado reconhecido.

### Hierarquia

1. Dioceses selecionadas
2. Em diálogo
3. Dados recebidos
4. Dados carregados
5. Homologação estrutural
6. Homologação completa

## 5. Informações intermediárias ausentes do Trello

Não é necessário alterar o board para tudo. Use `data/manual-overrides.json` somente para complementar o que não existe no Trello, por exemplo Regional, Província, percentuais de tipos de dados ou marcos de diálogo.

Copie a estrutura de `data/manual-overrides.example.json`.

Exemplo:

```json
{
  "dioceses": [
    {
      "nome": "Diocese de Exemplo - UF",
      "regional": "Regional de exemplo",
      "provincia": "Província de exemplo",
      "dados": {
        "estrutura": 100,
        "curia": 80,
        "igrejas": 70,
        "tribunais": 20,
        "outras": 30,
        "fieis": 0
      },
      "dialogo": {
        "chanceler": true,
        "equipe": true
      }
    }
  ],
  "evolution": []
}
```

Os dados do Trello prevalecem quando o mesmo dado já estiver disponível lá; o arquivo manual completa as lacunas.

## 6. Ajustar nomes/etiquetas sem alterar o Trello

- Listas: `data/trello-list-map.json`
- Etiquetas: `data/trello-label-map.json`

Você pode acrescentar aliases sem renomear o board.

## 7. Vercel

No projeto da Vercel, configure em **Settings → Environment Variables**:

- `TRELLO_MODE=trello`
- `TRELLO_BOARD_ID=KaACdOVE`
- `TRELLO_API_KEY`
- `TRELLO_TOKEN`

Não envie `.env.local` ao GitHub.

## Escrita no Trello

O painel fica em leitura por padrão. `DASHBOARD_WRITE_SECRET` está vazio. Só habilite edição em produção depois de configurar autenticação apropriada. O board atual usa etiquetas para diversos marcos; a leitura dessas etiquetas já está adaptada, mas alterações de etiquetas pelo drawer não são habilitadas automaticamente.
