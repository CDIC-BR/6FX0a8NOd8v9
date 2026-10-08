export type StageName =
  | "Dioceses selecionadas"
  | "Em diálogo"
  | "Dados recebidos"
  | "Dados carregados"
  | "Homologação estrutural"
  | "Homologação completa";

export type GroupName = "Piloto" | "Ciclo atual";

export interface TrelloLabel {
  id: string;
  name: string;
  color?: string | null;
}

export interface TrelloCard {
  id: string;
  name: string;
  idList: string;
  closed: boolean;
  labels: TrelloLabel[];
  dateLastActivity?: string | null;
  url?: string | null;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
}

export interface TrelloSnapshot {
  boardId: string;
  boardName: string;
  shortLink: string;
  dateLastActivity?: string | null;
  lists: TrelloList[];
  cards: TrelloCard[];
}

export interface DioceseMeta {
  key: string;
  numero: string;
  nome: string;
  regional: string;
  provincia: string;
  grupo: GroupName;
}

export interface CircunscricaoBase {
  numero: string;
  nome: string;
  regional: string;
  provincia: string;
}

export interface DioceseDashboard {
  id: string;
  nome: string;
  regional: string;
  provincia: string;
  grupo: GroupName;
  etapa: StageName;
  etapaOrdem: number;
  termoAssinado: boolean;
  labels: string[];
  labelDetails: TrelloLabel[];
  trelloUrl?: string | null;
  ultimaAtividade?: string | null;
}

export interface StageSummary {
  etapa: StageName;
  ordem: number;
  quantidade: number | null;
  percentual: number | null;
  disponivel: boolean;
}

export interface DashboardPayload {
  source: "trello" | "snapshot";
  sourceLabel: string;
  warning?: string;
  generatedAt: string;
  boardLastActivity?: string | null;
  baseTotal: number;
  naoParticipantes: number;
  naoParticipantesLista: CircunscricaoBase[];
  participantes: number;
  termosAssinados: number;
  pilotos: number;
  homologacaoEstrutural: number;
  homologacaoCompletaDisponivel: boolean;
  stages: StageSummary[];
  dioceses: DioceseDashboard[];
}
