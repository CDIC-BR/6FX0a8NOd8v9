import type { DimensionKey, StageKey } from "@/types/dashboard";
import listMap from "@/data/trello-list-map.json";

export const STAGE_ORDER: StageKey[] = [
  "selecionadas",
  "dialogo",
  "recebidos",
  "carregados",
  "homologacaoEstrutural",
  "homologacaoCompleta",
];

export const STAGES: Record<StageKey, { label: string; aliases: string[]; description: string }> = {
  selecionadas: {
    label: "Dioceses selecionadas",
    aliases: ["Dioceses selecionadas", "Selecionadas", ...listMap.selecionadas],
    description: "Dioceses definidas para participação no processo.",
  },
  dialogo: {
    label: "Em diálogo",
    aliases: ["Em diálogo", "Em dialogo", "Adesão e articulação", "Adesao e articulacao", "Contato inicial", "Contato ativo", ...listMap.dialogo],
    description: "Dioceses com contato e articulação em andamento.",
  },
  recebidos: {
    label: "Dados recebidos",
    aliases: ["Dados recebidos", "Recebidos", ...listMap.recebidos],
    description: "Dioceses que já enviaram os dados solicitados, ainda que o envio possa ocorrer de forma parcial até a conclusão.",
  },
  carregados: {
    label: "Dados carregados",
    aliases: ["Dados carregados", "Dados importados", "Carregados", ...listMap.carregados],
    description: "Dados recebidos e carregados/importados no sistema.",
  },
  homologacaoEstrutural: {
    label: "Homologação estrutural",
    aliases: ["Homologação estrutural", "Homologacao estrutural", "Estrutura homologada", ...listMap.homologacaoEstrutural],
    description: "Usuários ativos, uso contínuo, estrutura validada e instituições cadastradas/confirmadas.",
  },
  homologacaoCompleta: {
    label: "Homologação completa",
    aliases: ["Homologação completa", "Homologacao completa", "Homologação final", "Homologacao final", ...listMap.homologacaoCompleta],
    description: "Homologação estrutural concluída, com cadastro e validação dos dados de pessoas.",
  },
};

export const CUSTOM_FIELDS: Record<DimensionKey, string[]> = {
  estrutura: ["Estrutura organizacional", "Estrutura"],
  curia: ["Cúria", "Curia"],
  igrejas: ["Igrejas"],
  tribunais: ["Tribunais e câmaras", "Tribunais", "Tribunais e Camaras"],
  outras: ["Outras instituições", "Outras instituicoes"],
  fieis: ["Fiéis", "Fieis", "Dados de Fiéis", "Dados de Fieis"],
};

export const DIALOGUE_CHECKLIST_ALIASES = [
  "Em diálogo",
  "Em dialogo",
  "Adesão e articulação",
  "Adesao e articulacao",
  "Contato inicial",
];

export const DIALOGUE_ITEMS = {
  termoEnviado: ["Termo enviado"],
  termoAssinado: ["Termo assinado"],
  chanceler: ["Contato com o chanceler", "Chanceler contatado"],
  equipe: ["Contato com a equipe", "Equipe contatada"],
} as const;

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function matchesAlias(value: string, aliases: readonly string[]) {
  const normalized = normalize(value);
  return aliases.some((alias) => normalize(alias) === normalized);
}
