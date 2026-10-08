import metadata from "@/data/dioceses-meta.json";
import baseCircunscricoes from "@/data/circunscricoes-base.json";
import rules from "@/data/stage-rules.json";
import { normalizeDioceseName } from "@/lib/normalize";
import { getTrelloSnapshot } from "@/lib/trello";
import type {
  CircunscricaoBase,
  DashboardPayload,
  DioceseDashboard,
  DioceseMeta,
  StageName,
} from "@/lib/types";

const STAGES: StageName[] = [
  "Dioceses selecionadas",
  "Em diálogo",
  "Dados recebidos",
  "Dados carregados",
  "Homologação estrutural",
  "Homologação completa",
];

const RANK = Object.fromEntries(STAGES.map((s, i) => [s, i + 1])) as Record<StageName, number>;
const BASE_TOTAL = 281;

function isStageName(value: string): value is StageName {
  return STAGES.includes(value as StageName);
}

function deriveStage(listName: string): StageName {
  // A etapa atual é definida exclusivamente pela lista em que o cartão está no Trello.
  // Etiquetas são informativas e não promovem o cartão para outra etapa.
  return isStageName(listName) ? listName : "Dioceses selecionadas";
}

export async function buildDashboard(): Promise<DashboardPayload> {
  const { snapshot, source, warning } = await getTrelloSnapshot();
  const listById = new Map(snapshot.lists.map((list) => [list.id, list.name]));
  const metaByKey = new Map((metadata as DioceseMeta[]).map((item) => [item.key, item]));
  const validLists = new Set(Object.values(rules.stageLists));
  const ignoredLists = new Set(rules.ignoredLists || []);

  const dioceses: DioceseDashboard[] = snapshot.cards
    .filter((card) => !card.closed)
    .filter((card) => {
      const listName = listById.get(card.idList) || "";
      return !ignoredLists.has(listName) && validLists.has(listName);
    })
    .map((card) => {
      const listName = listById.get(card.idList) || "";
      const key = normalizeDioceseName(card.name);
      const meta = metaByKey.get(key);
      const labels = (card.labels || []).map((label) => label.name).filter(Boolean);
      const isPilot = labels.includes(rules.pilotLabel);
      const stage = deriveStage(listName);

      return {
        id: card.id,
        nome: meta?.nome || card.name.replace(/\s*-\s*[A-Z]{2}\s*-?\s*$/, "").trim(),
        regional: meta?.regional || "Não informado",
        provincia: meta?.provincia || "Não informado",
        grupo: isPilot ? "Piloto" : meta?.grupo || "Ciclo atual",
        etapa: stage,
        etapaOrdem: RANK[stage],
        termoAssinado: labels.includes(rules.signedLabel),
        labels,
        labelDetails: (card.labels || []).filter((label) => Boolean(label.name)),
        trelloUrl: card.url,
        ultimaAtividade: card.dateLastActivity,
      } satisfies DioceseDashboard;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const participantKeys = new Set(dioceses.map((item) => normalizeDioceseName(item.nome)));
  const naoParticipantesLista = (baseCircunscricoes as CircunscricaoBase[])
    .filter((item) => !participantKeys.has(normalizeDioceseName(item.nome)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const homologacaoCompletaDisponivel =
    process.env.HOMOLOGACAO_COMPLETA_ENABLED?.toLowerCase() === "true";

  const stages = STAGES.map((etapa, index) => {
    if (etapa === "Homologação completa" && !homologacaoCompletaDisponivel) {
      return { etapa, ordem: index + 1, quantidade: null, percentual: null, disponivel: false };
    }
    const quantidade = dioceses.filter((d) => d.etapa === etapa).length;
    return {
      etapa,
      ordem: index + 1,
      quantidade,
      percentual: dioceses.length ? (quantidade / dioceses.length) * 100 : 0,
      disponivel: true,
    };
  });

  return {
    source,
    sourceLabel: source === "trello" ? "Trello · tempo real" : "Snapshot do Trello",
    warning,
    generatedAt: new Date().toISOString(),
    boardLastActivity: snapshot.dateLastActivity,
    baseTotal: BASE_TOTAL,
    naoParticipantes: naoParticipantesLista.length,
    naoParticipantesLista,
    participantes: dioceses.length,
    termosAssinados: dioceses.filter((d) => d.termoAssinado).length,
    pilotos: dioceses.filter((d) => d.grupo === "Piloto").length,
    homologacaoEstrutural: dioceses.filter((d) => d.etapa === "Homologação estrutural").length,
    homologacaoCompletaDisponivel,
    stages,
    dioceses,
  };
}
