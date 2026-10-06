export type StageKey =
  | "selecionadas"
  | "dialogo"
  | "recebidos"
  | "carregados"
  | "homologacaoEstrutural"
  | "homologacaoCompleta";

export type DimensionKey =
  | "estrutura"
  | "curia"
  | "igrejas"
  | "tribunais"
  | "outras"
  | "fieis";

export interface DimensionProgress {
  key: DimensionKey;
  label: string;
  value: number;
}

export interface DialogueProgress {
  termoEnviado: boolean;
  termoAssinado: boolean;
  chanceler: boolean;
  equipe: boolean;
}

export interface Diocese {
  id: string;
  name: string;
  regional: string;
  provincia: string;
  stage: StageKey;
  stageLabel: string;
  progress: Record<DimensionKey, number>;
  dialogue: DialogueProgress;
  overall: number;
  updatedAt: string;
  trelloUrl?: string;
}

export interface SummaryMetric {
  key: StageKey;
  label: string;
  value: number;
  percentage: number;
  tooltip: string;
}

export interface EvolutionPoint {
  label: string;
  recebidos: number;
  carregados: number;
  homologacaoEstrutural: number;
  homologacaoCompleta: number;
}

export interface DashboardData {
  source: "mock" | "trello";
  updatedAt: string;
  total: number;
  metrics: SummaryMetric[];
  dimensions: DimensionProgress[];
  dialogue: {
    total: number;
    termoEnviado: number;
    termoAssinado: number;
    chanceler: number;
    equipe: number;
  };
  evolution: EvolutionPoint[];
  dioceses: Diocese[];
}
