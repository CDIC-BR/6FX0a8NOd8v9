import {
  ADOPTION_CHECKLIST_ALIASES,
  ADOPTION_ITEMS,
  CUSTOM_FIELDS,
  DIMENSION_WEIGHTS,
  STAGES,
  matchesAlias,
} from "@/lib/config";
import type {
  AdoptionProgress,
  DashboardData,
  Diocese,
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

function weightedOverall(progress: Record<DimensionKey, number>) {
  return Math.round(
    (Object.keys(progress) as DimensionKey[]).reduce(
      (sum, key) => sum + (progress[key] * DIMENSION_WEIGHTS[key]) / 100,
      0,
    ),
  );
}

function checklistProgress(checklists: TrelloChecklist[]): AdoptionProgress {
  const checklist = checklists.find((c) => matchesAlias(c.name, ADOPTION_CHECKLIST_ALIASES));
  const items = checklist?.checkItems ?? [];
  const completed = (aliases: readonly string[]) =>
    items.some((item) => matchesAlias(item.name, aliases) && item.state === "complete");
  return {
    termoEnviado: completed(ADOPTION_ITEMS.termoEnviado),
    termoAssinado: completed(ADOPTION_ITEMS.termoAssinado),
    chanceler: completed(ADOPTION_ITEMS.chanceler),
    equipe: completed(ADOPTION_ITEMS.equipe),
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
      const list = listById.get(card.idList);
      const stage = stageFromList(list?.name ?? "");
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
        adoption: checklistProgress(checklists),
        overall: weightedOverall(progress),
        updatedAt: card.dateLastActivity,
        trelloUrl: card.url,
      };
    }),
  );

  const total = dioceses.length || 1;
  const stageOrder: StageKey[] = ["selecionadas", "adesao", "estruturacao", "complementacao", "fieis", "homologacao"];
  const tooltips: Record<StageKey, string> = {
    selecionadas: "Total de dioceses incluídas no board.",
    adesao: "Cards que alcançaram a etapa de Adesão e articulação ou uma etapa posterior.",
    estruturacao: "Cards em Estruturação inicial ou etapa posterior.",
    complementacao: "Cards em Complementação institucional ou etapa posterior.",
    fieis: "Cards em Dados de Fiéis ou Homologação final.",
    homologacao: "Cards atualmente em Homologação final.",
  };
  const metrics = stageOrder.map((key) => {
    const idx = stageOrder.indexOf(key);
    const value = key === "selecionadas"
      ? dioceses.length
      : dioceses.filter((d) => stageOrder.indexOf(d.stage) >= idx).length;
    return {
      key,
      label: STAGES[key].label,
      value,
      percentage: dioceses.length ? Math.round((value / dioceses.length) * 100) : 0,
      tooltip: tooltips[key],
    };
  });

  const dimensionLabels: Record<DimensionKey, string> = {
    fieis: "Fiéis",
    estrutura: "Estrutura organizacional",
    curia: "Cúria",
    igrejas: "Igrejas",
    tribunais: "Tribunais e câmaras",
    outras: "Outras instituições",
  };
  const dimensions = (Object.keys(dimensionLabels) as DimensionKey[]).map((key) => ({
    key,
    label: dimensionLabels[key],
    value: Math.round(dioceses.reduce((sum, d) => sum + d.progress[key], 0) / total),
    weight: DIMENSION_WEIGHTS[key],
  }));
  const adoption = {
    total: dioceses.length,
    termoEnviado: dioceses.filter((d) => d.adoption.termoEnviado).length,
    termoAssinado: dioceses.filter((d) => d.adoption.termoAssinado).length,
    chanceler: dioceses.filter((d) => d.adoption.chanceler).length,
    equipe: dioceses.filter((d) => d.adoption.equipe).length,
  };
  const faithfulValues = dioceses.map((d) => d.progress.fieis);
  const faithful = {
    average: Math.round(faithfulValues.reduce((a, b) => a + b, 0) / total),
    complete: faithfulValues.filter((v) => v === 100).length,
    inProgress: faithfulValues.filter((v) => v > 0 && v < 100).length,
    notStarted: faithfulValues.filter((v) => v === 0).length,
  };

  return {
    source: "trello",
    updatedAt: new Date().toISOString(),
    total: dioceses.length,
    metrics,
    dimensions,
    adoption,
    faithful,
    // Sem armazenamento histórico, a API entrega somente a fotografia atual.
    // O gráfico usa este ponto; snapshots persistentes podem ser adicionados depois.
    evolution: [{
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date()),
      estruturacao: metrics.find((m) => m.key === "estruturacao")?.value ?? 0,
      fieis: metrics.find((m) => m.key === "fieis")?.value ?? 0,
      homologacao: metrics.find((m) => m.key === "homologacao")?.value ?? 0,
    }],
    dioceses,
  };
}

export async function updateTrelloProgress(
  cardId: string,
  payload: { progress?: Partial<Record<DimensionKey, number>> },
) {
  const writeSecret = process.env.DASHBOARD_WRITE_SECRET;
  if (!writeSecret) {
    throw new Error("Escrita desabilitada. Configure DASHBOARD_WRITE_SECRET e implemente a autenticação desejada antes de habilitar edição em produção.");
  }
  const { boardId } = credentials();
  const fields = await trelloFetch<TrelloCustomField[]>(`/boards/${boardId}/customFields`);
  const updates = (Object.entries(payload.progress ?? {}) as [DimensionKey, number][])
    .map(([key, value]) => {
      const field = fields.find((candidate) => matchesAlias(candidate.name, CUSTOM_FIELDS[key]));
      if (!field) return null;
      return { idCustomField: field.id, value: { number: String(clampPercent(value)) } };
    })
    .filter(Boolean);
  if (!updates.length) return { updated: 0 };

  const { key, token } = credentials();
  const response = await fetch(`${BASE}/cards/${cardId}/customFields?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ customFieldItems: updates }),
  });
  if (!response.ok) throw new Error(`Falha ao atualizar Trello: ${response.status} ${await response.text()}`);
  return { updated: updates.length };
}
