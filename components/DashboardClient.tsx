"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import EChart from "@/components/EChart";
import type { DashboardData, Diocese, DimensionKey, StageKey } from "@/types/dashboard";

const BLUE = "#077dcc";
const TEXT = "#15304b";
const MUTED = "#65798d";
const GRID = "#e8eef5";
const STAGE_COLORS = ["#dceefa", "#c6e5f7", "#9fd2ef", "#6db8e4", "#3599d6", "#077dcc"];

const stageIcon: Record<StageKey, string> = {
  selecionadas: "◆",
  dialogo: "↔",
  recebidos: "⇣",
  carregados: "⇧",
  homologacaoEstrutural: "◎",
  homologacaoCompleta: "✓",
};

const dimensionLabels: Record<DimensionKey, string> = {
  estrutura: "Estrutura organizacional",
  curia: "Cúria",
  igrejas: "Igrejas",
  tribunais: "Tribunais e câmaras",
  outras: "Outras instituições",
  fieis: "Fiéis",
};

function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function Info({ text }: { text: string }) {
  return (
    <span className="infoWrap" tabIndex={0} aria-label={text}>
      <span className="infoIcon">i</span>
      <span className="tooltip" role="tooltip">{text}</span>
    </span>
  );
}

function MetricCard({ metric, active, onOpen }: {
  metric: DashboardData["metrics"][number];
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button className={`metricCard ${active ? "active" : ""}`} onClick={onOpen} type="button">
      <div className="metricTop">
        <span className="metricIcon">{stageIcon[metric.key]}</span>
        <span className="metricLabel">{metric.label}</span>
        <Info text={metric.tooltip} />
      </div>
      <strong>{metric.value}</strong>
      <span>{metric.percentage}% das selecionadas</span>
      <div className="progressTrack"><i style={{ width: `${metric.percentage}%` }} /></div>
    </button>
  );
}

function DialogueBreakdown({ data }: { data: DashboardData["dialogue"] }) {
  const items = [
    ["Termo enviado", data.termoEnviado],
    ["Termo assinado", data.termoAssinado],
    ["Contato com o chanceler", data.chanceler],
    ["Contato com a equipe", data.equipe],
  ] as const;
  return (
    <div className="adoptionList">
      {items.map(([label, value]) => {
        const pct = percentage(value, data.total);
        return (
          <div className="adoptionItem" key={label}>
            <div className="rowBetween"><span>{label}</span><b>{value}/{data.total} · {pct}%</b></div>
            <div className="progressTrack"><i style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function StagePanel({ stage, data }: { stage: StageKey; data: DashboardData }) {
  const metric = data.metrics.find((item) => item.key === stage)!;
  const exact = data.dioceses.filter((d) => d.stage === stage).length;
  const dataStages: StageKey[] = ["recebidos", "carregados", "homologacaoEstrutural", "homologacaoCompleta"];

  return (
    <section className="panel stagePanel" id="stage-detail">
      <div className="sectionTitle">
        <div><span className="eyebrow">DRILL-DOWN DA ETAPA</span><h2>{metric.label}</h2></div>
        <span className="pill">{metric.percentage}% alcançaram</span>
      </div>
      <p className="stageDescription">{metric.tooltip}</p>
      <div className="stageNumbers">
        <div><strong>{metric.value}</strong><span>alcançaram esta etapa ou uma posterior</span></div>
        <div><strong>{exact}</strong><span>estão atualmente nesta etapa</span></div>
      </div>

      {stage === "dialogo" && (
        <>
          <div className="subsectionLabel">Marcos do diálogo</div>
          <DialogueBreakdown data={data.dialogue} />
          <div className="infoBox">O avanço do diálogo é calculado pelos marcos concluídos; a lista do Trello continua definindo a macroetapa atual.</div>
        </>
      )}

      {dataStages.includes(stage) && (
        <>
          <div className="subsectionLabel">Completude média por tipo de dado</div>
          <div className="miniDimensionList">
            {data.dimensions.map((dim) => (
              <div key={dim.key} className="miniDimensionRow">
                <span>{dim.label}</span>
                <div className="progressTrack"><i style={{ width: `${dim.value}%` }} /></div>
                <b>{dim.value}%</b>
              </div>
            ))}
          </div>
          <div className="infoBox">Os percentuais detalham o conjunto de dados como um todo. Fiéis aparece apenas como uma das dimensões e ganha relevância operacional na homologação completa.</div>
        </>
      )}

      {stage === "selecionadas" && <div className="infoBox">Esta é a base do funil: todas as demais etapas são calculadas em relação às dioceses selecionadas.</div>}
    </section>
  );
}

function DioceseDrawer({ diocese, onClose, onSave }: {
  diocese: Diocese;
  onClose: () => void;
  onSave: (d: Diocese) => void;
}) {
  const [draft, setDraft] = useState(diocese);
  const dims = Object.keys(dimensionLabels) as DimensionKey[];

  return (
    <div className="drawerBackdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" aria-label={`Detalhe de ${diocese.name}`}>
        <div className="drawerHeader">
          <div><span className="eyebrow">DIOCESE</span><h2>{diocese.name}</h2><p>{diocese.stageLabel} · completude média dos dados {draft.overall}%</p></div>
          <button onClick={onClose} type="button" className="iconButton" aria-label="Fechar">×</button>
        </div>

        <div className="drawerSection">
          <h3>Em diálogo</h3>
          {Object.entries({ termoEnviado: "Termo enviado", termoAssinado: "Termo assinado", chanceler: "Contato com o chanceler", equipe: "Contato com a equipe" }).map(([key, label]) => (
            <label className="checkLine" key={key}>
              <input
                type="checkbox"
                checked={draft.dialogue[key as keyof typeof draft.dialogue]}
                onChange={(e) => setDraft({ ...draft, dialogue: { ...draft.dialogue, [key]: e.target.checked } })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="drawerSection">
          <h3>Completude por tipo de dado</h3>
          {dims.map((key) => (
            <label className="rangeLine" key={key}>
              <span><b>{dimensionLabels[key]}</b><em>{draft.progress[key]}%</em></span>
              <input
                type="range"
                min="0"
                max="100"
                value={draft.progress[key]}
                onChange={(e) => {
                  const progress = { ...draft.progress, [key]: Number(e.target.value) };
                  const values = Object.values(progress);
                  const overall = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
                  setDraft({ ...draft, progress, overall });
                }}
              />
            </label>
          ))}
        </div>

        <div className="drawerFooter">
          <button className="secondaryButton" onClick={onClose} type="button">Cancelar</button>
          <button className="primaryButton" onClick={() => onSave(draft)} type="button">Salvar alterações</button>
        </div>
      </aside>
    </div>
  );
}

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [selectedMetric, setSelectedMetric] = useState<StageKey>("dialogo");
  const [selectedDiocese, setSelectedDiocese] = useState<Diocese | null>(null);
  const [query, setQuery] = useState("");
  const [regional, setRegional] = useState("Todos");
  const [stageFilter, setStageFilter] = useState<"Todos" | StageKey>("Todos");
  const [period, setPeriod] = useState("6m");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error ?? "Falha ao atualizar");
      setData(next);
      setNotice("Dados atualizados com sucesso.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha ao atualizar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(refresh, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const filtered = useMemo(() => data.dioceses.filter((d) => {
    const matchesText = d.name.toLowerCase().includes(query.toLowerCase());
    const matchesRegional = regional === "Todos" || d.regional === regional;
    const matchesStage = stageFilter === "Todos" || d.stage === stageFilter;
    return matchesText && matchesRegional && matchesStage;
  }), [data.dioceses, query, regional, stageFilter]);

  const regionals = useMemo(() => ["Todos", ...Array.from(new Set(data.dioceses.map((d) => d.regional).filter((v) => v !== "—"))).sort()], [data.dioceses]);

  const stageDistribution = useMemo(() => data.metrics.map((metric, index) => ({
    key: metric.key,
    name: metric.label,
    value: data.dioceses.filter((d) => d.stage === metric.key).length,
    color: STAGE_COLORS[index],
  })), [data.dioceses, data.metrics]);

  const donutOption = useMemo<EChartsOption>(() => ({
    animationDuration: 450,
    tooltip: { trigger: "item", formatter: "{b}<br/><b>{c}</b> dioceses · {d}%" },
    series: [{
      type: "pie",
      radius: ["61%", "82%"],
      center: ["42%", "50%"],
      itemStyle: { borderColor: "#fff", borderWidth: 3, borderRadius: 5 },
      label: { show: false },
      data: stageDistribution.map((item) => ({ value: item.value, name: item.name, itemStyle: { color: item.color } })),
    }],
    graphic: [
      { type: "text", left: "35%", top: "39%", style: { text: `${data.total}`, fill: TEXT, fontSize: 28, fontWeight: 700 } },
      { type: "text", left: "30%", top: "54%", style: { text: "dioceses selecionadas", fill: MUTED, fontSize: 11 } },
    ],
  }), [stageDistribution, data.total]);

  const evolutionPoints = useMemo(() => {
    if (period === "3m") return data.evolution.slice(-3);
    if (period === "30d") return data.evolution.slice(-2);
    return data.evolution;
  }, [data.evolution, period]);

  const lineOption = useMemo<EChartsOption>(() => ({
    animationDuration: 500,
    tooltip: { trigger: "axis", backgroundColor: "#102f4c", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, textStyle: { color: MUTED, fontSize: 10 } },
    grid: { left: 40, right: 18, top: 25, bottom: 58 },
    xAxis: { type: "category", boundaryGap: false, data: evolutionPoints.map((p) => p.label), axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED } },
    yAxis: { type: "value", min: 0, axisLabel: { color: MUTED }, splitLine: { lineStyle: { color: GRID } } },
    series: [
      { name: "Dados recebidos", type: "line", smooth: true, symbolSize: 7, data: evolutionPoints.map((p) => p.recebidos), lineStyle: { width: 3, color: "#077dcc" }, itemStyle: { color: "#077dcc" } },
      { name: "Dados carregados", type: "line", smooth: true, symbolSize: 7, data: evolutionPoints.map((p) => p.carregados), lineStyle: { width: 3, color: "#3298d7" }, itemStyle: { color: "#3298d7" } },
      { name: "Homologação estrutural", type: "line", smooth: true, symbolSize: 7, data: evolutionPoints.map((p) => p.homologacaoEstrutural), lineStyle: { width: 3, color: "#72bbe5" }, itemStyle: { color: "#72bbe5" } },
      { name: "Homologação completa", type: "line", smooth: true, symbolSize: 7, data: evolutionPoints.map((p) => p.homologacaoCompleta), lineStyle: { width: 3, color: "#acd9f1" }, itemStyle: { color: "#acd9f1" } },
    ],
  }), [evolutionPoints]);

  const dataTypeOption = useMemo<EChartsOption>(() => ({
    animationDuration: 450,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 148, right: 38, top: 8, bottom: 22 },
    xAxis: { type: "value", min: 0, max: 100, axisLabel: { color: MUTED, formatter: "{value}%" }, splitLine: { lineStyle: { color: GRID } } },
    yAxis: { type: "category", inverse: true, data: data.dimensions.map((d) => d.label), axisLabel: { color: TEXT, fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: "bar",
      barWidth: 12,
      data: data.dimensions.map((d) => d.value),
      itemStyle: { color: BLUE, borderRadius: [0, 7, 7, 0] },
      label: { show: true, position: "right", color: TEXT, formatter: "{c}%", fontSize: 10, fontWeight: 700 },
    }],
  }), [data.dimensions]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showConstruction(area: string, suggestion: string) {
    setNotice(`${area} ainda está em construção. Sugestão prevista: ${suggestion}`);
  }

  async function saveDiocese(next: Diocese) {
    if (data.source !== "mock") {
      try {
        const secret = window.prompt("Informe o segredo de escrita configurado no ambiente da Vercel:");
        if (!secret) return;
        const response = await fetch(`/api/dioceses/${next.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-dashboard-write-secret": secret },
          body: JSON.stringify({ progress: next.progress, dialogue: next.dialogue }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Falha ao salvar");
        setSelectedDiocese(null);
        if ((body.updated ?? 0) > 0) {
          setNotice(`${body.updated} item(ns) atualizado(s) no Trello. Informações que não existem no board continuam vindo do complemento manual.`);
        } else {
          setNotice("Nenhum campo correspondente foi encontrado no Trello. Para esses dados, edite data/manual-overrides.json ou crie os campos/checklists no board.");
        }
        await refresh();
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Falha ao salvar");
      }
    } else {
      setData((prev) => ({ ...prev, dioceses: prev.dioceses.map((d) => d.id === next.id ? next : d) }));
      setSelectedDiocese(null);
      setNotice("Alteração aplicada no modo demonstração. Ao recarregar, os dados simulados originais retornam.");
    }
  }

  return (
    <div className={`appShell ${sidebarCollapsed ? "sidebarCollapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><img src="/logo.svg" alt="Logo CDIC-BR" /></div>
          <div className="brandText"><b>CDIC-BR</b><span>Acompanhamento da implantação</span></div>
          <button className="collapseButton" type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}>{sidebarCollapsed ? "›" : "‹"}</button>
        </div>
        <nav>
          <button className="active" type="button" onClick={() => scrollTo("top")} title="Painel"><span className="navIcon">▣</span><span className="navLabel">Painel</span></button>
          <button type="button" onClick={() => scrollTo("dioceses")} title="Dioceses"><span className="navIcon">◆</span><span className="navLabel">Dioceses</span></button>
          <button type="button" onClick={() => scrollTo("etapas")} title="Etapas"><span className="navIcon">☷</span><span className="navLabel">Etapas</span></button>
          <button type="button" onClick={() => showConstruction("Sincronização", "exibir conexão com o Trello, última sincronização, listas mapeadas e eventuais erros de leitura.")} title="Sincronização"><span className="navIcon">↻</span><span className="navLabel">Sincronização</span></button>
          <button type="button" onClick={() => showConstruction("Configurações", "parametrizar nomes das listas, campos personalizados, checklist e frequência de atualização.")} title="Configurações"><span className="navIcon">⚙</span><span className="navLabel">Configurações</span></button>
        </nav>
        <div className="sideFooter">Painel de acompanhamento<br/><small>Fonte principal: Trello</small></div>
      </aside>

      <main id="top">
        <header className="topbar">
          <div><h1>Painel de Acompanhamento</h1><p>Dados de {formatDate(data.updatedAt, true)} · Fonte: {data.source === "hybrid" ? "Trello + complemento manual" : data.source === "trello" ? "Trello" : "demonstração"}</p></div>
          <button className="primaryButton" onClick={refresh} disabled={loading} type="button">↻ {loading ? "Atualizando…" : "Atualizar agora"}</button>
        </header>

        {notice && <button type="button" className="notice" onClick={() => setNotice(null)}>{notice}<span>×</span></button>}

        <section className="filters">
          <label>Regional<select value={regional} onChange={(e) => setRegional(e.target.value)}>{regionals.map((v) => <option key={v}>{v}</option>)}</select></label>
          <label>Etapa atual<select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as "Todos" | StageKey)}><option value="Todos">Todas</option>{data.metrics.map((m) => <option value={m.key} key={m.key}>{m.label}</option>)}</select></label>
          <label>Período do gráfico<select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="30d">30 dias</option><option value="3m">3 meses</option><option value="6m">6 meses</option></select></label>
          <label className="searchLabel">Buscar diocese<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite o nome…" /></label>
        </section>

        <section className="processFlow" id="etapas" aria-label="Etapas de evolução da implantação">
          {data.metrics.map((metric, index) => (
            <div className="processStep" key={metric.key}>
              <MetricCard metric={metric} active={selectedMetric === metric.key} onOpen={() => setSelectedMetric(metric.key)} />
              {index < data.metrics.length - 1 && (
                <div className="stageConnector" aria-hidden="true">
                  <span className="connectorHorizontal">→</span>
                  <span className="connectorVertical">↓</span>
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="dashboardGrid">
          <div className="leftColumn">
            <div className="chartGrid">
              <section className="panel">
                <div className="sectionTitle"><div><span className="eyebrow">DISTRIBUIÇÃO ATUAL</span><h2>Dioceses por etapa <Info text="O donut mostra a etapa atual de cada diocese, sem contagem duplicada entre as fatias. Os cards acima, por outro lado, são cumulativos e mostram quantas já alcançaram cada marco." /></h2></div></div>
                <div className="donutLayout">
                  <EChart option={donutOption} height={280}/>
                  <div className="legendList">
                    {stageDistribution.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.name}<b>{item.value}</b></span>)}
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="sectionTitle"><div><span className="eyebrow">CRESCIMENTO</span><h2>Evolução da implantação <Info text="Série temporal dos principais marcos de dados e homologação. O título e a data de atualização deixam explícita a fotografia temporal exibida." /></h2></div></div>
                <EChart option={lineOption} height={310}/>
              </section>
            </div>

            <section className="panel">
              <div className="sectionTitle"><div><span className="eyebrow">DADOS INTERMEDIÁRIOS</span><h2>Completude média por tipo de dado <Info text="O gráfico considera todos os tipos de dado: Estrutura organizacional, Cúria, Igrejas, Tribunais e câmaras, Outras instituições e Fiéis. Nenhuma dimensão é isolada na visão principal." /></h2></div><span className="pill">Todos os tipos de dado</span></div>
              <EChart option={dataTypeOption} height={260}/>
            </section>

            <section className="panel tablePanel" id="dioceses">
              <div className="sectionTitle"><div><span className="eyebrow">DRILL-DOWN</span><h2>Dioceses</h2></div><span className="muted">{filtered.length} exibidas</span></div>
              <div className="tableWrap">
                <table>
                  <thead><tr><th>Diocese</th><th>Regional</th><th>Etapa atual</th><th>Completude dos dados</th><th>Atualização</th></tr></thead>
                  <tbody>{filtered.slice(0, 20).map((d) => (
                    <tr key={d.id} onClick={() => setSelectedDiocese(d)}>
                      <td><b>{d.name}</b></td><td>{d.regional}</td><td><span className="stageTag">{d.stageLabel}</span></td>
                      <td><div className="inlineProgress"><div className="progressTrack"><i style={{ width: `${d.overall}%` }} /></div><b>{d.overall}%</b></div></td>
                      <td>{formatDate(d.updatedAt)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          </div>

          <StagePanel stage={selectedMetric} data={data} />
        </section>

        <footer className="pageFooter">Atualização automática a cada 1 hora enquanto o painel estiver aberto. <b>{data.source === "mock" ? "Modo demonstração ativo." : data.source === "hybrid" ? "Trello conectado com complemento manual." : "Conectado ao Trello."}</b></footer>
      </main>

      {selectedDiocese && <DioceseDrawer diocese={selectedDiocese} onClose={() => setSelectedDiocese(null)} onSave={saveDiocese} />}
    </div>
  );
}
