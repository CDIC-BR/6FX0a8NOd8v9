import manualJson from "@/data/manual-overrides.json";
import { normalize } from "@/lib/config";
import type { DialogueProgress, DimensionKey, EvolutionPoint } from "@/types/dashboard";

export interface ManualDioceseOverride {
  trelloCardId?: string;
  nome: string;
  regional?: string;
  provincia?: string;
  dados?: Partial<Record<DimensionKey, number>>;
  dialogo?: Partial<DialogueProgress>;
}

interface ManualData {
  dioceses: ManualDioceseOverride[];
  evolution: EvolutionPoint[];
}

const manual = manualJson as ManualData;

export function findManualDiocese(cardId: string, cardName: string) {
  return manual.dioceses.find((item) =>
    (item.trelloCardId && item.trelloCardId === cardId) || normalize(item.nome) === normalize(cardName),
  );
}

export function getManualEvolution() {
  return manual.evolution ?? [];
}

export function hasManualData() {
  return (manual.dioceses?.length ?? 0) > 0 || (manual.evolution?.length ?? 0) > 0;
}
