export type StageKey =
  | "selecionadas"
  | "adesao"
  | "estruturacao"
  | "complementacao"
  | "fieis"
  | "homologacao";

export type DimensionKey =
  | "fieis"
  | "estrutura"
  | "curia"
  | "igrejas"
  | "tribunais"
  | "outras";

export interface DimensionProgress {
  key: DimensionKey;
  label: string;
  value: number;
  weight: number;
}

export interface AdoptionProgress {
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
  adoption: AdoptionProgress;
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
  estruturacao: number;
  fieis: number;
  homologacao: number;
}

export interface DashboardData {
  source: "mock" | "trello";
  updatedAt: string;
  total: number;
  metrics: SummaryMetric[];
  dimensions: DimensionProgress[];
  adoption: {
    total: number;
    termoEnviado: number;
    termoAssinado: number;
    chanceler: number;
    equipe: number;
  };
  faithful: {
    average: number;
    complete: number;
    inProgress: number;
    notStarted: number;
  };
  evolution: EvolutionPoint[];
  dioceses: Diocese[];
}
