import {
  CUSTOM_FIELDS,
  DIALOGUE_CHECKLIST_ALIASES,
  DIALOGUE_ITEMS,
  STAGES,
  STAGE_ORDER,
  matchesAlias,
} from "@/lib/config";
import type {
  DashboardData,
  Diocese,
  DialogueProgress,
  DimensionKey,
  StageKey,
} from "@/types/dashboard";

type TrelloList = { id: string; name: string; closed?: boolean };
type TrelloCustomField = { id: string; name: string; type: string };
type TrelloCustomFieldItem = {
  idCustomField: string;
  value?: { number?: string; text?: string; checked?: string; date?: string };
  idValue?: string;
};
type TrelloCheckItem = { id: string; name: string; state: "complete" | "incomplete" };
type TrelloChecklist = { id: string; name: string; checkItems: TrelloCheckItem[] };
type TrelloCard = {
  id: string;
  name: string;
  idList: string;
  dateLastActivity: string;
  url?: string;
};

const BASE = "https://api.trello.com/1";

function credentials() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const boardId = process.env.TRELLO_BOARD_ID;
  if (!key || !token || !boardId) {
    throw new Error("Credenciais do Trello incompletas. Preencha TRELLO_API_KEY, TRELLO_TOKEN e TRELLO_BOARD_ID.");
  }
  return { key, token, boardId };
}

async function trelloFetch<T>(path: string): Promise<T> {
  const { key, token } = credentials();
  const joiner = path.includes("?") ? "&" : "?";
  const response = await fetch(`${BASE}${path}${joiner}key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Trello respondeu ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

function stageFromList(name: string): StageKey {
  const entries = Object.entries(STAGES) as [StageKey, (typeof STAGES)[StageKey]][];
  return entries.find(([, value]) => matchesAlias(name, value.aliases))?.[0] ?? "selecionadas";
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseFieldValue(item: TrelloCustomFieldItem | undefined) {
  const raw = item?.value?.number ?? item?.value?.text;
  if (!raw) return 0;
  const parsed = Number(String(raw).replace(",", "."));
  return Number.isFinite(parsed) ? clampPercent(parsed) : 0;
}

function averageOverall(progress: Record<DimensionKey, number>) {
  const values = Object.values(progress);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function checklistProgress(checklists: TrelloChecklist[]): DialogueProgress {
  const checklist = checklists.find((c) => matchesAlias(c.name, DIALOGUE_CHECKLIST_ALIASES));
  const items = checklist?.checkItems ?? [];
  const completed = (aliases: readonly string[]) =>
    items.some((item) => matchesAlias(item.name, aliases) && item.state === "complete");
  return {
    termoEnviado: completed(DIALOGUE_ITEMS.termoEnviado),
    termoAssinado: completed(DIALOGUE_ITEMS.termoAssinado),
    chanceler: completed(DIALOGUE_ITEMS.chanceler),
    equipe: completed(DIALOGUE_ITEMS.equipe),
  };
}

export async function getTrelloDashboard(): Promise<DashboardData> {
  const { boardId } = credentials();
  const [lists, fields, cards] = await Promise.all([
    trelloFetch<TrelloList[]>(`/boards/${boardId}/lists?fields=id,name,closed&filter=open`),
    trelloFetch<TrelloCustomField[]>(`/boards/${boardId}/customFields`),
    trelloFetch<TrelloCard[]>(`/boards/${boardId}/cards/open?fields=id,name,idList,dateLastActivity,url`),
  ]);

  const listById = new Map(lists.map((list) => [list.id, list]));
  const fieldByDimension = new Map<DimensionKey, TrelloCustomField>();
  (Object.keys(CUSTOM_FIELDS) as DimensionKey[]).forEach((key) => {
    const match = fields.find((field) => matchesAlias(field.name, CUSTOM_FIELDS[key]));
    if (match) fieldByDimension.set(key, match);
  });

  const dioceses: Diocese[] = await Promise.all(
    cards.map(async (card) => {
      const [customItems, checklists] = await Promise.all([
        trelloFetch<TrelloCustomFieldItem[]>(`/cards/${card.id}/customFieldItems`),
        trelloFetch<TrelloChecklist[]>(`/cards/${card.id}/checklists?checkItems=all&checkItem_fields=name,state&fields=name`),
      ]);
      const stage = stageFromList(listById.get(card.idList)?.name ?? "");
      const progress = {} as Record<DimensionKey, number>;
      (Object.keys(CUSTOM_FIELDS) as DimensionKey[]).forEach((key) => {
        const field = fieldByDimension.get(key);
        progress[key] = field
          ? parseFieldValue(customItems.find((item) => item.idCustomField === field.id))
          : 0;
      });
      return {
        id: card.id,
        name: card.name,
        regional: "—",
        provincia: "—",
        stage,
        stageLabel: STAGES[stage].label,
        progress,
        dialogue: checklistProgress(checklists),
        overall: averageOverall(progress),
        updatedAt: card.dateLastActivity,
        trelloUrl: card.url,
      };
    }),
  );

  const total = dioceses.length || 1;
  const tooltips: Record<StageKey, string> = {
    selecionadas: "Total de dioceses definidas para participação no processo.",
    dialogo: "Dioceses que chegaram à fase de contato e articulação. O detalhamento considera os marcos do diálogo inicial.",
    recebidos: "Dioceses que já enviaram dados solicitados, ainda que o envio possa ser parcial.",
    carregados: "Dioceses cujos dados recebidos já foram carregados ou importados no sistema.",
    homologacaoEstrutural: "Usuários ativos, uso contínuo, estrutura validada e instituições cadastradas ou confirmadas.",
    homologacaoCompleta: "Homologação estrutural concluída, incluindo cadastro e validação dos dados de pessoas.",
  };

  const metrics = STAGE_ORDER.map((key) => {
    const idx = STAGE_ORDER.indexOf(key);
    const value = key === "selecionadas"
      ? dioceses.length
      : dioceses.filter((d) => STAGE_ORDER.indexOf(d.stage) >= idx).length;
    return {
      key,
      label: STAGES[key].label,
      value,
      percentage: dioceses.length ? Math.round((value / dioceses.length) * 100) : 0,
      tooltip: tooltips[key],
    };
  });

  const dimensionLabels: Record<DimensionKey, string> = {
    estrutura: "Estrutura organizacional",
    curia: "Cúria",
    igrejas: "Igrejas",
    tribunais: "Tribunais e câmaras",
    outras: "Outras instituições",
    fieis: "Fiéis",
  };
  const dimensions = (Object.keys(dimensionLabels) as DimensionKey[]).map((key) => ({
    key,
    label: dimensionLabels[key],
    value: Math.round(dioceses.reduce((sum, d) => sum + d.progress[key], 0) / total),
  }));

  const dialogue = {
    total: dioceses.length,
    termoEnviado: dioceses.filter((d) => d.dialogue.termoEnviado).length,
    termoAssinado: dioceses.filter((d) => d.dialogue.termoAssinado).length,
    chanceler: dioceses.filter((d) => d.dialogue.chanceler).length,
    equipe: dioceses.filter((d) => d.dialogue.equipe).length,
  };

  const metricValue = (key: StageKey) => metrics.find((m) => m.key === key)?.value ?? 0;
  return {
    source: "trello",
    updatedAt: new Date().toISOString(),
    total: dioceses.length,
    metrics,
    dimensions,
    dialogue,
    evolution: [{
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date()),
      recebidos: metricValue("recebidos"),
      carregados: metricValue("carregados"),
      homologacaoEstrutural: metricValue("homologacaoEstrutural"),
      homologacaoCompleta: metricValue("homologacaoCompleta"),
    }],
    dioceses,
  };
}

export async function updateTrelloProgress(
  cardId: string,
  payload: {
    progress?: Partial<Record<DimensionKey, number>>;
    dialogue?: Partial<DialogueProgress>;
  },
) {
  const writeSecret = process.env.DASHBOARD_WRITE_SECRET;
  if (!writeSecret) {
    throw new Error("Escrita desabilitada. Configure DASHBOARD_WRITE_SECRET e autenticação antes de habilitar edição em produção.");
  }

  const { boardId, key, token } = credentials();
  const fields = await trelloFetch<TrelloCustomField[]>(`/boards/${boardId}/customFields`);
  const fieldUpdates = (Object.entries(payload.progress ?? {}) as [DimensionKey, number][])
    .map(([dimension, value]) => {
      const field = fields.find((candidate) => matchesAlias(candidate.name, CUSTOM_FIELDS[dimension]));
      if (!field) return null;
      return { idCustomField: field.id, value: { number: String(clampPercent(value)) } };
    })
    .filter(Boolean);

  let updated = 0;
  if (fieldUpdates.length) {
    const response = await fetch(`${BASE}/cards/${cardId}/customFields?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ customFieldItems: fieldUpdates }),
    });
    if (!response.ok) throw new Error(`Falha ao atualizar campos do Trello: ${response.status} ${await response.text()}`);
    updated += fieldUpdates.length;
  }

  if (payload.dialogue) {
    const checklists = await trelloFetch<TrelloChecklist[]>(`/cards/${cardId}/checklists?checkItems=all&checkItem_fields=name,state&fields=name`);
    const checklist = checklists.find((candidate) => matchesAlias(candidate.name, DIALOGUE_CHECKLIST_ALIASES));
    if (checklist) {
      const mappings: Array<[keyof DialogueProgress, readonly string[]]> = [
        ["termoEnviado", DIALOGUE_ITEMS.termoEnviado],
        ["termoAssinado", DIALOGUE_ITEMS.termoAssinado],
        ["chanceler", DIALOGUE_ITEMS.chanceler],
        ["equipe", DIALOGUE_ITEMS.equipe],
      ];
      for (const [dialogueKey, aliases] of mappings) {
        const requested = payload.dialogue[dialogueKey];
        if (requested === undefined) continue;
        const item = checklist.checkItems.find((candidate) => matchesAlias(candidate.name, aliases));
        if (!item) continue;
        const desiredState = requested ? "complete" : "incomplete";
        if (item.state === desiredState) continue;
        const params = new URLSearchParams({
          state: desiredState,
          key,
          token,
        });
        const response = await fetch(`${BASE}/cards/${cardId}/checkItem/${item.id}?${params.toString()}`, {
          method: "PUT",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Falha ao atualizar checklist do Trello: ${response.status} ${await response.text()}`);
        updated += 1;
      }
    }
  }

  return { updated };
}
