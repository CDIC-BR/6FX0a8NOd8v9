import { DIMENSION_WEIGHTS, STAGES } from "@/lib/config";
import type { DashboardData, Diocese, DimensionKey, StageKey } from "@/types/dashboard";

const names = [
  ["Arquidiocese de Aparecida (SP)", "Sul 1", "Aparecida"],
  ["Diocese de Campina Grande (PB)", "Nordeste 2", "Paraíba"],
  ["Diocese de Sinop (MT)", "Oeste 2", "Mato Grosso"],
  ["Arquidiocese de Santarém (PA)", "Norte 2", "Pará"],
  ["Diocese de Apucarana (PR)", "Sul 2", "Paraná"],
  ["Arquidiocese de Brasília (DF)", "Centro-Oeste", "Brasília"],
  ["Diocese de Crato (CE)", "Nordeste 1", "Ceará"],
  ["Diocese de Joinville (SC)", "Sul 4", "Santa Catarina"],
  ["Diocese de Marabá (PA)", "Norte 2", "Pará"],
  ["Diocese de Uberlândia (MG)", "Leste 2", "Minas Gerais"],
  ["Diocese de Bauru (SP)", "Sul 1", "São Paulo"],
  ["Diocese de Guarabira (PB)", "Nordeste 2", "Paraíba"],
  ["Diocese de Rondonópolis (MT)", "Oeste 2", "Mato Grosso"],
  ["Diocese de Ponta Grossa (PR)", "Sul 2", "Paraná"],
  ["Diocese de Formosa (GO)", "Centro-Oeste", "Goiás"],
  ["Diocese de Sobral (CE)", "Nordeste 1", "Ceará"],
  ["Diocese de Blumenau (SC)", "Sul 4", "Santa Catarina"],
  ["Diocese de Abaetetuba (PA)", "Norte 2", "Pará"],
  ["Diocese de Divinópolis (MG)", "Leste 2", "Minas Gerais"],
  ["Diocese de Franca (SP)", "Sul 1", "São Paulo"],
  ["Diocese de Patos (PB)", "Nordeste 2", "Paraíba"],
  ["Diocese de Cáceres (MT)", "Oeste 2", "Mato Grosso"],
  ["Diocese de Umuarama (PR)", "Sul 2", "Paraná"],
  ["Diocese de Luziânia (GO)", "Centro-Oeste", "Goiás"],
  ["Diocese de Tianguá (CE)", "Nordeste 1", "Ceará"],
  ["Diocese de Chapecó (SC)", "Sul 4", "Santa Catarina"],
  ["Diocese de Bragança do Pará (PA)", "Norte 2", "Pará"],
  ["Diocese de Sete Lagoas (MG)", "Leste 2", "Minas Gerais"],
  ["Diocese de Jundiaí (SP)", "Sul 1", "São Paulo"],
  ["Diocese de Cajazeiras (PB)", "Nordeste 2", "Paraíba"],
  ["Diocese de Juína (MT)", "Oeste 2", "Mato Grosso"],
  ["Diocese de Paranavaí (PR)", "Sul 2", "Paraná"],
  ["Diocese de Uruaçu (GO)", "Centro-Oeste", "Goiás"],
  ["Diocese de Iguatu (CE)", "Nordeste 1", "Ceará"],
  ["Diocese de Caçador (SC)", "Sul 4", "Santa Catarina"],
  ["Diocese de Castanhal (PA)", "Norte 2", "Pará"],
  ["Diocese de Itabira (MG)", "Leste 2", "Minas Gerais"],
  ["Diocese de Limeira (SP)", "Sul 1", "São Paulo"],
  ["Diocese de Caruaru (PE)", "Nordeste 2", "Pernambuco"],
  ["Diocese de Barra do Garças (MT)", "Oeste 2", "Mato Grosso"],
];

const stageCounts: Array<[StageKey, number]> = [
  ["homologacao", 8],
  ["fieis", 6],
  ["complementacao", 6],
  ["estruturacao", 7],
  ["adesao", 7],
  ["selecionadas", 6],
];

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function overall(progress: Record<DimensionKey, number>) {
  return Math.round(
    (Object.keys(progress) as DimensionKey[]).reduce(
      (sum, key) => sum + (progress[key] * DIMENSION_WEIGHTS[key]) / 100,
      0,
    ),
  );
}

function makeProgress(stage: StageKey, index: number): Record<DimensionKey, number> {
  const wobble = (index * 7) % 13;
  if (stage === "homologacao") {
    return { fieis: 100, estrutura: 100, curia: 100, igrejas: 100, tribunais: 100, outras: 100 };
  }
  if (stage === "fieis") {
    return {
      fieis: clamp(35 + index * 5),
      estrutura: 100,
      curia: clamp(90 + wobble),
      igrejas: clamp(85 + wobble),
      tribunais: clamp(60 + wobble),
      outras: clamp(55 + wobble),
    };
  }
  if (stage === "complementacao") {
    return {
      fieis: clamp(index * 4),
      estrutura: clamp(90 + wobble),
      curia: clamp(85 + wobble),
      igrejas: clamp(78 + wobble),
      tribunais: clamp(30 + index * 5),
      outras: clamp(25 + index * 5),
    };
  }
  if (stage === "estruturacao") {
    return {
      fieis: 0,
      estrutura: clamp(45 + index * 6),
      curia: clamp(35 + index * 6),
      igrejas: clamp(25 + index * 6),
      tribunais: clamp(index * 2),
      outras: clamp(index * 2),
    };
  }
  return { fieis: 0, estrutura: 0, curia: 0, igrejas: 0, tribunais: 0, outras: 0 };
}

function makeDioceses(): Diocese[] {
  let cursor = 0;
  return stageCounts.flatMap(([stage, count]) =>
    Array.from({ length: count }, (_, localIndex) => {
      const [name, regional, provincia] = names[cursor];
      const index = cursor++;
      const progress = makeProgress(stage, localIndex + 1);
      const adoption = {
        termoEnviado: stage !== "selecionadas" || localIndex > 1,
        termoAssinado: !["selecionadas"].includes(stage) && !(stage === "adesao" && localIndex > 4),
        chanceler: !["selecionadas"].includes(stage) && !(stage === "adesao" && localIndex > 3),
        equipe: !["selecionadas"].includes(stage) && !(stage === "adesao" && localIndex > 2),
      };
      return {
        id: `mock-${index + 1}`,
        name,
        regional,
        provincia,
        stage,
        stageLabel: STAGES[stage].label,
        progress,
        adoption,
        overall: overall(progress),
        updatedAt: new Date(Date.UTC(2026, 9, Math.max(1, 6 - (index % 5)), 17, 0)).toISOString(),
      };
    }),
  );
}

export function getMockDashboard(): DashboardData {
  const dioceses = makeDioceses();
  const total = dioceses.length;

  const metrics = (Object.keys(STAGES) as StageKey[]).map((key) => {
    const threshold: StageKey[] = ["selecionadas", "adesao", "estruturacao", "complementacao", "fieis", "homologacao"];
    const idx = threshold.indexOf(key);
    const value = key === "selecionadas"
      ? total
      : dioceses.filter((d) => threshold.indexOf(d.stage) >= idx).length;
    const tooltips: Record<StageKey, string> = {
      selecionadas: "Total de dioceses incluídas no acompanhamento.",
      adesao: "Dioceses que já iniciaram a adesão e articulação. O detalhamento considera termo enviado, termo assinado e contatos realizados.",
      estruturacao: "Dioceses que alcançaram a estruturação inicial. O drill-down detalha Estrutura organizacional, Cúria e Igrejas.",
      complementacao: "Dioceses que já avançaram para Tribunais e câmaras e Outras instituições.",
      fieis: "Dioceses com envio de dados de Fiéis iniciado. A completude pode ser parcial antes da homologação final.",
      homologacao: "Dioceses com todas as dimensões concluídas e homologadas.",
    };
    return { key, label: STAGES[key].label, value, percentage: Math.round((value / total) * 100), tooltip: tooltips[key] };
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
    total,
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
    source: "mock",
    updatedAt: new Date(Date.UTC(2026, 9, 6, 17, 0)).toISOString(),
    total,
    metrics,
    dimensions,
    adoption,
    faithful,
    evolution: [
      { label: "Mai/2026", estruturacao: 8, fieis: 3, homologacao: 1 },
      { label: "Jun/2026", estruturacao: 14, fieis: 7, homologacao: 3 },
      { label: "Jul/2026", estruturacao: 18, fieis: 10, homologacao: 5 },
      { label: "Ago/2026", estruturacao: 23, fieis: 15, homologacao: 6 },
      { label: "Set/2026", estruturacao: 29, fieis: 20, homologacao: 7 },
      { label: "Out/2026", estruturacao: 34, fieis: 26, homologacao: 8 },
    ],
    dioceses,
  };
}
