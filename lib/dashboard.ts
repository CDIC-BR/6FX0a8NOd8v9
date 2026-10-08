import metadata from "@/data/dioceses-meta.json";
import baseCircunscricoes from "@/data/circunscricoes-base.json";
import rules from "@/data/stage-rules.json";
import { normalizeDioceseName } from "@/lib/normalize";
import { getTrelloSnapshot } from "@/lib/trello";
import { getRuntimeConfig } from "@/lib/env";
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
  "Dados parciais carregados",
  "Homologação estrutural",
  "Homologação completa",
];

const RANK = Object.fromEntries(STAGES.map((s, i) => [s, i + 1])) as Record<StageName, number>;
const BASE_TOTAL = 281;

function deriveStage(listId: string, listName: string): StageName | null {
  // A etapa atual é definida exclusivamente pela LISTA do cartão no Trello.
  // Usamos primeiro o ID da lista, que permanece estável mesmo quando o nome é alterado.
  // O nome é mantido apenas como fallback para snapshots antigos ou novas instalações.
  const byId = (rules.stageListIds as Record<string, StageName | undefined>)[listId];
  if (byId) return byId;

  const byName = (rules.stageListNameAliases as Record<string, StageName | undefined>)[listName];
  return byName || null;
}

export async function buildDashboard(): Promise<DashboardPayload> {
  const { snapshot, source, warning } = await getTrelloSnapshot();
  const listById = new Map(snapshot.lists.map((list) => [list.id, list.name]));
  const metaByKey = new Map((metadata as DioceseMeta[]).map((item) => [item.key, item]));
  const ignoredLists = new Set(rules.ignoredLists || []);
  const ignoredListIds = new Set(rules.ignoredListIds || []);

  // O ID da lista define a etapa de negócio. O nome exibido vem SEMPRE do
  // nome atual da lista retornado pelo Trello. Assim, renomear uma lista
  // não quebra a classificação e também é refletido automaticamente na UI.
  const stageDisplayNames = new Map<StageName, string>();
  for (const [listId, semanticStage] of Object.entries(
    rules.stageListIds as Record<string, StageName>
  )) {
    stageDisplayNames.set(semanticStage, listById.get(listId) || semanticStage);
  }

  const dioceses: DioceseDashboard[] = snapshot.cards
    .filter((card) => !card.closed)
    .filter((card) => {
      const listName = listById.get(card.idList) || "";
      if (ignoredListIds.has(card.idList) || ignoredLists.has(listName)) return false;
      return deriveStage(card.idList, listName) !== null;
    })
    .map((card) => {
      const listName = listById.get(card.idList) || "";
      const key = normalizeDioceseName(card.name);
      const meta = metaByKey.get(key);
      const labels = (card.labels || []).map((label) => label.name).filter(Boolean);
      const isPilot = labels.includes(rules.pilotLabel);
      const stage = deriveStage(card.idList, listName)!;

      return {
        id: card.id,
        nome: meta?.nome || card.name.replace(/\s*-\s*[A-Z]{2}\s*-?\s*$/, "").trim(),
        regional: meta?.regional || "Não informado",
        provincia: meta?.provincia || "Não informado",
        grupo: isPilot ? "Piloto" : meta?.grupo || "Ciclo atual",
        etapa: stage,
        etapaLabel: listName || stageDisplayNames.get(stage) || stage,
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

  const homologacaoCompletaDisponivel = getRuntimeConfig().homologacaoCompletaEnabled;

  const stages = STAGES.map((etapa, index) => {
    if (etapa === "Homologação completa" && !homologacaoCompletaDisponivel) {
      return {
        etapa,
        rotulo: stageDisplayNames.get(etapa) || etapa,
        ordem: index + 1,
        quantidade: null,
        percentual: null,
        disponivel: false,
      };
    }
    const quantidade = dioceses.filter((d) => d.etapa === etapa).length;
    return {
      etapa,
      rotulo: stageDisplayNames.get(etapa) || etapa,
      ordem: index + 1,
      quantidade,
      percentual: dioceses.length ? (quantidade / dioceses.length) * 100 : 0,
      disponivel: true,
    };
  });

  return {
    source,
    sourceLabel: source === "trello" ? "informações atualizadas" : "Snapshot do Trello",
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
