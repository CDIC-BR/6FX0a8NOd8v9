import { STAGES, STAGE_ORDER } from "@/lib/config";
import type { DashboardData, Diocese, DimensionKey, StageKey } from "@/types/dashboard";

const names: Array<[string, string, string]> = [
  ["Arquidiocese de Aparecida (SP)", "Sul 1", "Aparecida"],
  ["Diocese de Campina Grande (PB)", "Nordeste 2", "Paraíba"],
  ["Diocese de Sinop (MT)", "Oeste 2", "Mato Grosso"],
  ["Arquidiocese de Santarém (PA)", "Norte 2", "Santarém"],
  ["Diocese de Apucarana (PR)", "Sul 2", "Paraná"],
  ["Arquidiocese de Brasília (DF)", "Centro-Oeste", "Brasília"],
  ["Diocese de Crato (CE)", "Nordeste 1", "Ceará"],
  ["Diocese de Joinville (SC)", "Sul 4", "Santa Catarina"],
  ["Diocese de Marabá (PA)", "Norte 2", "Pará"],
  ["Diocese de Uberlândia (MG)", "Leste 2", "Minas Gerais"],
  ["Diocese de São Carlos (SP)", "Sul 1", "São Paulo"],
  ["Diocese de Garanhuns (PE)", "Nordeste 2", "Pernambuco"],
  ["Diocese de Rondonópolis (MT)", "Oeste 2", "Mato Grosso"],
  ["Diocese de Guarapuava (PR)", "Sul 2", "Paraná"],
  ["Diocese de Anápolis (GO)", "Centro-Oeste", "Goiás"],
  ["Diocese de Sobral (CE)", "Nordeste 1", "Ceará"],
  ["Diocese de Chapecó (SC)", "Sul 4", "Santa Catarina"],
  ["Diocese de Bragança do Pará (PA)", "Norte 2", "Pará"],
  ["Diocese de Divinópolis (MG)", "Leste 2", "Minas Gerais"],
  ["Diocese de Franca (SP)", "Sul 1", "São Paulo"],
  ["Diocese de Nazaré (PE)", "Nordeste 2", "Pernambuco"],
  ["Diocese de Cáceres (MT)", "Oeste 2", "Mato Grosso"],
  ["Diocese de Ponta Grossa (PR)", "Sul 2", "Paraná"],
  ["Diocese de Jataí (GO)", "Centro-Oeste", "Goiás"],
  ["Diocese de Tianguá (CE)", "Nordeste 1", "Ceará"],
  ["Diocese de Joaçaba (SC)", "Sul 4", "Santa Catarina"],
  ["Diocese de Cametá (PA)", "Norte 2", "Pará"],
  ["Diocese de Patos de Minas (MG)", "Leste 2", "Minas Gerais"],
  ["Diocese de Jundiaí (SP)", "Sul 1", "São Paulo"],
  ["Diocese de Palmares (PE)", "Nordeste 2", "Pernambuco"],
  ["Diocese de Barra do Garças (MT)", "Oeste 2", "Mato Grosso"],
  ["Diocese de Umuarama (PR)", "Sul 2", "Paraná"],
  ["Diocese de Formosa (GO)", "Centro-Oeste", "Goiás"],
  ["Diocese de Iguatu (CE)", "Nordeste 1", "Ceará"],
  ["Diocese de Caçador (SC)", "Sul 4", "Santa Catarina"],
  ["Diocese de Castanhal (PA)", "Norte 2", "Pará"],
  ["Diocese de Itabira (MG)", "Leste 2", "Minas Gerais"],
  ["Diocese de Limeira (SP)", "Sul 1", "São Paulo"],
  ["Diocese de Caruaru (PE)", "Nordeste 2", "Pernambuco"],
  ["Diocese de Uruaçu (GO)", "Centro-Oeste", "Goiás"],
];

const stageCounts: Array<[StageKey, number]> = [
  ["homologacaoCompleta", 6],
  ["homologacaoEstrutural", 5],
  ["carregados", 7],
  ["recebidos", 8],
  ["dialogo", 8],
  ["selecionadas", 6],
];

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function overall(progress: Record<DimensionKey, number>) {
  const values = Object.values(progress);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function makeProgress(stage: StageKey, index: number): Record<DimensionKey, number> {
  const wobble = (index * 7) % 15;
  if (stage === "homologacaoCompleta") {
    return { estrutura: 100, curia: 100, igrejas: 100, tribunais: 100, outras: 100, fieis: 100 };
  }
  if (stage === "homologacaoEstrutural") {
    return {
      estrutura: 100,
      curia: 100,
      igrejas: clamp(92 + wobble),
      tribunais: clamp(80 + wobble),
      outras: clamp(75 + wobble),
      fieis: clamp(10 + index * 8),
    };
  }
  if (stage === "carregados") {
    return {
      estrutura: clamp(85 + wobble),
      curia: clamp(80 + wobble),
      igrejas: clamp(70 + wobble),
      tribunais: clamp(45 + index * 5),
      outras: clamp(40 + index * 5),
      fieis: clamp(index * 5),
    };
  }
  if (stage === "recebidos") {
    return {
      estrutura: clamp(60 + index * 4),
      curia: clamp(55 + index * 4),
      igrejas: clamp(45 + index * 4),
      tribunais: clamp(15 + index * 4),
      outras: clamp(12 + index * 4),
      fieis: index > 5 ? clamp((index - 5) * 7) : 0,
    };
  }
  if (stage === "dialogo") {
    return {
      estrutura: index > 5 ? clamp((index - 5) * 8) : 0,
      curia: 0,
      igrejas: 0,
      tribunais: 0,
      outras: 0,
      fieis: 0,
    };
  }
  return { estrutura: 0, curia: 0, igrejas: 0, tribunais: 0, outras: 0, fieis: 0 };
}

function makeDioceses(): Diocese[] {
  let cursor = 0;
  return stageCounts.flatMap(([stage, count]) =>
    Array.from({ length: count }, (_, localIndex) => {
      const [name, regional, provincia] = names[cursor];
      const index = cursor++;
      const progress = makeProgress(stage, localIndex + 1);
      const stageIndex = STAGE_ORDER.indexOf(stage);
      const beyondDialogue = stageIndex > STAGE_ORDER.indexOf("dialogo");
      const dialogue = {
        termoEnviado: beyondDialogue || stage === "dialogo" || (stage === "selecionadas" && localIndex > 3),
        termoAssinado: beyondDialogue || (stage === "dialogo" && localIndex < 7),
        chanceler: beyondDialogue || (stage === "dialogo" && localIndex < 6),
        equipe: beyondDialogue || (stage === "dialogo" && localIndex < 4),
      };
      return {
        id: `mock-${index + 1}`,
        name,
        regional,
        provincia,
        stage,
        stageLabel: STAGES[stage].label,
        progress,
        dialogue,
        overall: overall(progress),
        updatedAt: new Date(Date.UTC(2026, 9, Math.max(1, 6 - (index % 5)), 17, 0)).toISOString(),
      };
    }),
  );
}

export function getMockDashboard(): DashboardData {
  const dioceses = makeDioceses();
  const total = dioceses.length;

  const tooltips: Record<StageKey, string> = {
    selecionadas: "Total de dioceses definidas para participação no processo.",
    dialogo: "Dioceses que chegaram à fase de contato e articulação. O detalhamento considera termo enviado, termo assinado, contato com chanceler e contato com a equipe.",
    recebidos: "Dioceses que já enviaram dados solicitados. O envio pode ser parcial e a completude é detalhada por tipo de dado.",
    carregados: "Dioceses cujos dados recebidos já foram carregados ou importados no sistema.",
    homologacaoEstrutural: "Usuários ativos, uso contínuo, estrutura validada e instituições cadastradas ou confirmadas.",
    homologacaoCompleta: "Homologação estrutural concluída, incluindo cadastro e validação dos dados de pessoas.",
  };

  const metrics = STAGE_ORDER.map((key) => {
    const idx = STAGE_ORDER.indexOf(key);
    const value = key === "selecionadas"
      ? total
      : dioceses.filter((d) => STAGE_ORDER.indexOf(d.stage) >= idx).length;
    return {
      key,
      label: STAGES[key].label,
      value,
      percentage: Math.round((value / total) * 100),
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
    total,
    termoEnviado: dioceses.filter((d) => d.dialogue.termoEnviado).length,
    termoAssinado: dioceses.filter((d) => d.dialogue.termoAssinado).length,
    chanceler: dioceses.filter((d) => d.dialogue.chanceler).length,
    equipe: dioceses.filter((d) => d.dialogue.equipe).length,
  };

  return {
    source: "mock",
    updatedAt: new Date(Date.UTC(2026, 9, 6, 17, 0)).toISOString(),
    total,
    metrics,
    dimensions,
    dialogue,
    evolution: [
      { label: "Mai/2026", recebidos: 7, carregados: 3, homologacaoEstrutural: 1, homologacaoCompleta: 0 },
      { label: "Jun/2026", recebidos: 11, carregados: 6, homologacaoEstrutural: 2, homologacaoCompleta: 1 },
      { label: "Jul/2026", recebidos: 16, carregados: 10, homologacaoEstrutural: 4, homologacaoCompleta: 2 },
      { label: "Ago/2026", recebidos: 20, carregados: 13, homologacaoEstrutural: 7, homologacaoCompleta: 3 },
      { label: "Set/2026", recebidos: 23, carregados: 16, homologacaoEstrutural: 9, homologacaoCompleta: 5 },
      { label: "Out/2026", recebidos: 26, carregados: 18, homologacaoEstrutural: 11, homologacaoCompleta: 6 },
    ],
    dioceses,
  };
}
