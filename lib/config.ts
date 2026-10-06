import type { DimensionKey, StageKey } from "@/types/dashboard";

export const STAGES: Record<StageKey, { label: string; aliases: string[] }> = {
  selecionadas: {
    label: "Dioceses selecionadas",
    aliases: ["Dioceses selecionadas", "Selecionadas"],
  },
  adesao: {
    label: "Adesão e articulação",
    aliases: ["Adesão e articulação", "Contato inicial", "Contato ativo"],
  },
  estruturacao: {
    label: "Estruturação inicial",
    aliases: ["Estruturação inicial", "Estrutura inicial"],
  },
  complementacao: {
    label: "Complementação institucional",
    aliases: ["Complementação institucional", "Complementação dos dados"],
  },
  fieis: {
    label: "Dados de Fiéis",
    aliases: ["Dados de Fiéis", "Fiéis"],
  },
  homologacao: {
    label: "Homologação final",
    aliases: ["Homologação final", "Homologação completa"],
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

export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  fieis: 50,
  estrutura: 15,
  curia: 10,
  igrejas: 10,
  tribunais: 7.5,
  outras: 7.5,
};

export const ADOPTION_CHECKLIST_ALIASES = [
  "Adesão e articulação",
  "Adesao e articulacao",
  "Contato inicial",
];

export const ADOPTION_ITEMS = {
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
