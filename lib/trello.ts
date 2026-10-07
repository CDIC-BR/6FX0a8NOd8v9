import {
  CUSTOM_FIELDS,
  DIALOGUE_CHECKLIST_ALIASES,
  DIALOGUE_ITEMS,
  DIALOGUE_LABEL_ALIASES,
  STAGES,
  STAGE_LABEL_ALIASES,
  STAGE_ORDER,
  matchesAlias,
  normalize,
} from "@/lib/config";
import { findManualDiocese, getManualEvolution, hasManualData } from "@/lib/manual";
import type {
  DashboardData,
  Diocese,
  DialogueProgress,
  DimensionKey,
  EvolutionPoint,
  StageKey,
} from "@/types/dashboard";

type TrelloList = { id: string; name: string; closed?: boolean };
type TrelloLabel = { id?: string; name: string; color?: string | null };
type TrelloCustomFieldOption = { id: string; value?: { text?: string } };
type TrelloCustomField = { id: string; name: string; type: string; options?: TrelloCustomFieldOption[] };
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
  desc?: string;
  labels?: TrelloLabel[];
  idChecklists?: string[];
  customFieldItems?: TrelloCustomFieldItem[];
};

const BASE = "https://api.trello.com/1";
const REGIONAL_ALIASES = ["Regional", "Regional CNBB", "Regional episcopal"];
const PROVINCIA_ALIASES = ["Província", "Provincia", "Província eclesiástica", "Provincia eclesiastica"];

function credentials() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const boardId = process.env.TRELLO_BOARD_ID;
  if (!key || !token || !boardId) {
    throw new Error("Credenciais do Trello incompletas. Preencha TRELLO_API_KEY, TRELLO_TOKEN e TRELLO_BOARD_ID no .env.local.");
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
    const body = await response.text();
    throw new Error(`Trello respondeu ${response.status}: ${body || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function trelloFetchOptional<T>(path: string, fallback: T): Promise<T> {
  try {
    return await trelloFetch<T>(path);
  } catch {
    return fallback;
  }
}

function stageIndex(stage: StageKey) {
  return STAGE_ORDER.indexOf(stage);
}

function stageFromList(name: string): StageKey {
  const entries = Object.entries(STAGES) as [StageKey, (typeof STAGES)[StageKey]][];
  return entries.find(([, value]) => matchesAlias(name, value.aliases))?.[0] ?? "selecionadas";
}

function stageFromLabels(labels: TrelloLabel[]): StageKey {
  let result: StageKey = "selecionadas";
  for (const stage of STAGE_ORDER) {
    if (stage === "selecionadas") continue;
    const aliases = STAGE_LABEL_ALIASES[stage] ?? [];
    if (aliases.length && labels.some((label) => matchesAlias(label.name, aliases))) {
      if (stageIndex(stage) > stageIndex(result)) result = stage;
    }
  }
  return result;
}

function stageFromSignals(listName: string, labels: TrelloLabel[], manualStage?: StageKey): StageKey {
  if (manualStage) return manualStage;
  const fromList = stageFromList(listName);
  const fromLabels = stageFromLabels(labels);
  return stageIndex(fromLabels) > stageIndex(fromList) ? fromLabels : fromList;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseNumericFieldValue(item: TrelloCustomFieldItem | undefined): number | null {
  const raw = item?.value?.number ?? item?.value?.text;
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = Number(String(raw).replace(",", "."));
  return Number.isFinite(parsed) ? clampPercent(parsed) : null;
}

function parseTextFieldValue(field: TrelloCustomField | undefined, item: TrelloCustomFieldItem | undefined): string | null {
  if (!field || !item) return null;
  if (item.value?.text?.trim()) return item.value.text.trim();
  if (item.idValue && field.options) {
    const option = field.options.find((candidate) => candidate.id === item.idValue);
    return option?.value?.text?.trim() || null;
  }
  return null;
}

function averageOverall(progress: Record<DimensionKey, number>) {
  const values = Object.values(progress);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function readChecklistProgress(checklists: TrelloChecklist[]): Partial<DialogueProgress> {
  const checklist = checklists.find((c) => matchesAlias(c.name, DIALOGUE_CHECKLIST_ALIASES));
  const items = checklist?.checkItems ?? [];
  const state = (aliases: readonly string[]): boolean | undefined => {
    const item = items.find((candidate) => matchesAlias(candidate.name, aliases));
    return item ? item.state === "complete" : undefined;
  };
  return {
    termoEnviado: state(DIALOGUE_ITEMS.termoEnviado),
    termoAssinado: state(DIALOGUE_ITEMS.termoAssinado),
    chanceler: state(DIALOGUE_ITEMS.chanceler),
    equipe: state(DIALOGUE_ITEMS.equipe),
  };
}

function readLabelProgress(labels: TrelloLabel[], description = ""): Partial<DialogueProgress> {
  const hasLabel = (aliases: readonly string[]) => labels.some((label) => matchesAlias(label.name, aliases));
  const normalizedDescription = normalize(description);

  const termoAssinado = hasLabel(DIALOGUE_LABEL_ALIASES.termoAssinado) ? true : undefined;
  const termoEnviado = hasLabel(DIALOGUE_LABEL_ALIASES.termoEnviado) || termoAssinado ? true : undefined;
  const chanceler = hasLabel(DIALOGUE_LABEL_ALIASES.chanceler) || normalizedDescription.includes("chanceler") ? true : undefined;
  const equipe = hasLabel(DIALOGUE_LABEL_ALIASES.equipe) || normalizedDescription.includes("contato com a equipe") ? true : undefined;

  return { termoEnviado, termoAssinado, chanceler, equipe };
}

function mergePartialDialogue(...sources: Array<Partial<DialogueProgress> | undefined>): Partial<DialogueProgress> {
  const result: Partial<DialogueProgress> = {};
  const keys: Array<keyof DialogueProgress> = ["termoEnviado", "termoAssinado", "chanceler", "equipe"];
  for (const key of keys) {
    for (const source of sources) {
      if (source?.[key] !== undefined) {
        result[key] = source[key];
        break;
      }
    }
  }
  return result;
}

function finalizeDialogue(trello: Partial<DialogueProgress>, manual: Partial<DialogueProgress> | undefined): DialogueProgress {
  return {
    termoEnviado: trello.termoEnviado ?? manual?.termoEnviado ?? false,
    termoAssinado: trello.termoAssinado ?? manual?.termoAssinado ?? false,
    chanceler: trello.chanceler ?? manual?.chanceler ?? false,
    equipe: trello.equipe ?? manual?.equipe ?? false,
  };
}

function currentEvolutionPoint(metrics: DashboardData["metrics"]): EvolutionPoint {
  const metricValue = (key: StageKey) => metrics.find((m) => m.key === key)?.value ?? 0;
  return {
    label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date()),
    recebidos: metricValue("recebidos"),
    carregados: metricValue("carregados"),
    homologacaoEstrutural: metricValue("homologacaoEstrutural"),
    homologacaoCompleta: metricValue("homologacaoCompleta"),
  };
}

export async function getTrelloDashboard(): Promise<DashboardData> {
  const { boardId } = credentials();
  const [lists, fields, cards] = await Promise.all([
    trelloFetchOptional<TrelloList[]>(`/boards/${boardId}/lists?fields=id,name,closed&filter=open`, []),
    trelloFetchOptional<TrelloCustomField[]>(`/boards/${boardId}/customFields`, []),
    trelloFetch<TrelloCard[]>(
      `/boards/${boardId}/cards/open?fields=id,name,idList,dateLastActivity,url,desc,labels,idChecklists&customFieldItems=true`,
    ),
  ]);

  const listById = new Map(lists.map((list) => [list.id, list]));
  const fieldByDimension = new Map<DimensionKey, TrelloCustomField>();
  (Object.keys(CUSTOM_FIELDS) as DimensionKey[]).forEach((key) => {
    const match = fields.find((field) => matchesAlias(field.name, CUSTOM_FIELDS[key]));
    if (match) fieldByDimension.set(key, match);
  });
  const regionalField = fields.find((field) => matchesAlias(field.name, REGIONAL_ALIASES));
  const provinciaField = fields.find((field) => matchesAlias(field.name, PROVINCIA_ALIASES));

  const dioceses: Diocese[] = await Promise.all(
    cards.map(async (card) => {
      const labels = card.labels ?? [];
      const manual = findManualDiocese(card.id, card.name);
      const listName = listById.get(card.idList)?.name ?? "";
      const stage = stageFromSignals(listName, labels, manual?.etapa);
      const customItems = card.customFieldItems ?? [];
      const checklists = (card.idChecklists?.length ?? 0) > 0
        ? await trelloFetchOptional<TrelloChecklist[]>(
            `/cards/${card.id}/checklists?checkItems=all&checkItem_fields=name,state&fields=name`,
            [],
          )
        : [];

      const progress = {} as Record<DimensionKey, number>;
      (Object.keys(CUSTOM_FIELDS) as DimensionKey[]).forEach((key) => {
        const field = fieldByDimension.get(key);
        const trelloValue = field
          ? parseNumericFieldValue(customItems.find((item) => item.idCustomField === field.id))
          : null;
        progress[key] = trelloValue ?? manual?.dados?.[key] ?? 0;
      });

      const regionalTrello = parseTextFieldValue(
        regionalField,
        regionalField ? customItems.find((item) => item.idCustomField === regionalField.id) : undefined,
      );
      const provinciaTrello = parseTextFieldValue(
        provinciaField,
        provinciaField ? customItems.find((item) => item.idCustomField === provinciaField.id) : undefined,
      );

      const dialogueFromTrello = mergePartialDialogue(
        readChecklistProgress(checklists),
        readLabelProgress(labels, card.desc),
      );

      return {
        id: card.id,
        name: card.name,
        regional: regionalTrello ?? manual?.regional ?? "—",
        provincia: provinciaTrello ?? manual?.provincia ?? "—",
        stage,
        stageLabel: STAGES[stage].label,
        progress,
        dialogue: finalizeDialogue(dialogueFromTrello, manual?.dialogo),
        overall: averageOverall(progress),
        updatedAt: card.dateLastActivity,
        trelloUrl: card.url,
      };
    }),
  );

  const total = dioceses.length || 1;
  const tooltips: Record<StageKey, string> = {
    selecionadas: "Total de dioceses definidas para participação no processo.",
    dialogo: "Dioceses que chegaram à fase de contato e articulação. No seu Trello, etiquetas como Termo enviado/assinado e Aguardando envio da divisão territorial também alimentam esta etapa.",
    recebidos: "Dioceses que já enviaram dados solicitados. A etiqueta Divisão recebida é reconhecida automaticamente como este marco.",
    carregados: "Dioceses cujos dados recebidos já foram carregados ou importados. A etiqueta Divisão cadastrada é reconhecida automaticamente como este marco.",
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

  const current = currentEvolutionPoint(metrics);
  const manualEvolution = getManualEvolution();
  const evolution = manualEvolution.length ? [...manualEvolution] : [];
  const last = evolution[evolution.length - 1];
  if (!last || last.label !== current.label) evolution.push(current);
  else evolution[evolution.length - 1] = current;

  return {
    source: hasManualData() ? "hybrid" : "trello",
    updatedAt: new Date().toISOString(),
    total: dioceses.length,
    metrics,
    dimensions,
    dialogue,
    evolution,
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
  const fields = await trelloFetchOptional<TrelloCustomField[]>(`/boards/${boardId}/customFields`, []);
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
    const checklists = await trelloFetchOptional<TrelloChecklist[]>(
      `/cards/${cardId}/checklists?checkItems=all&checkItem_fields=name,state&fields=name`,
      [],
    );
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
        const params = new URLSearchParams({ state: desiredState, key, token });
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
