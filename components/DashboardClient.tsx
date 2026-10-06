"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import EChart from "@/components/EChart";
import type { DashboardData, Diocese, DimensionKey, StageKey } from "@/types/dashboard";

const BLUE = "#077dcc";
const BLUE_2 = "#43a6e8";
const BLUE_3 = "#93cff4";
const PALE = "#dceefa";
const GRID = "#e8eef5";
const TEXT = "#15304b";
const MUTED = "#65798d";

const stageIcon: Record<StageKey, string> = {
  selecionadas: "◆",
  adesao: "↔",
  estruturacao: "⚙",
  complementacao: "▤",
  fieis: "●",
  homologacao: "✓",
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

function MetricCard({ metric, onOpen }: { metric: DashboardData["metrics"][number]; onOpen: () => void }) {
  return (
    <button className="metricCard" onClick={onOpen} type="button">
      <div className="metricTop">
        <span className="metricIcon">{stageIcon[metric.key]}</span>
        <span className="metricLabel">{metric.label}</span>
        <Info text={metric.tooltip} />
      </div>
      <strong>{metric.value}</strong>
      <span>{metric.percentage}% das dioceses</span>
      <div className="progressTrack"><i style={{ width: `${metric.percentage}%` }} /></div>
    </button>
  );
}

function AdoptionPanel({ data }: { data: DashboardData["adoption"] }) {
  const items = [
    ["Termo enviado", data.termoEnviado],
    ["Termo assinado", data.termoAssinado],
    ["Contato com o chanceler", data.chanceler],
    ["Contato com a equipe", data.equipe],
  ] as const;
  return (
    <section className="panel adoptionPanel">
      <div className="sectionTitle"><div><span className="eyebrow">DRILL-DOWN</span><h2>Adesão e articulação</h2></div><span className="pill">{percentage(data.equipe, data.total)}% concluído</span></div>
      <div className="bigRatio"><strong>{data.equipe}</strong><span>de {data.total} dioceses concluíram todos os marcos</span></div>
      <div className="adoptionList">
        {items.map(([label, value]) => {
          const pct = percentage(value, data.total);
          return <div className="adoptionItem" key={label}><div className="rowBetween"><span>{label}</span><b>{value}/{data.total} · {pct}%</b></div><div className="progressTrack"><i style={{ width: `${pct}%` }} /></div></div>;
        })}
      </div>
      <div className="infoBox">A etapa combina formalização e articulação. O percentual não depende da posição do card no Trello: ele é calculado pelos itens concluídos.</div>
    </section>
  );
}

function DioceseDrawer({ diocese, onClose, onSave }: { diocese: Diocese; onClose: () => void; onSave: (d: Diocese) => void }) {
  const [draft, setDraft] = useState(diocese);
  const dims: Array<[DimensionKey, string]> = [
    ["estrutura", "Estrutura organizacional"], ["curia", "Cúria"], ["igrejas", "Igrejas"], ["tribunais", "Tribunais e câmaras"], ["outras", "Outras instituições"], ["fieis", "Fiéis"],
  ];
  return (
    <div className="drawerBackdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" aria-label={`Detalhe de ${diocese.name}`}>
        <div className="drawerHeader"><div><span className="eyebrow">DIOCESE</span><h2>{diocese.name}</h2><p>{diocese.stageLabel} · avanço geral {draft.overall}%</p></div><button onClick={onClose} type="button" className="iconButton">×</button></div>
        <div className="drawerSection"><h3>Adesão e articulação</h3>{Object.entries({ termoEnviado: "Termo enviado", termoAssinado: "Termo assinado", chanceler: "Contato com o chanceler", equipe: "Contato com a equipe" }).map(([key, label]) => <label className="checkLine" key={key}><input type="checkbox" checked={draft.adoption[key as keyof typeof draft.adoption]} onChange={(e) => setDraft({ ...draft, adoption: { ...draft.adoption, [key]: e.target.checked } })} /><span>{label}</span></label>)}</div>
        <div className="drawerSection"><h3>Completude dos dados</h3>{dims.map(([key, label]) => <label className="rangeLine" key={key}><span><b>{label}</b><em>{draft.progress[key]}%</em></span><input type="range" min="0" max="100" value={draft.progress[key]} onChange={(e) => { const progress = { ...draft.progress, [key]: Number(e.target.value) }; const weights = { fieis: 50, estrutura: 15, curia: 10, igrejas: 10, tribunais: 7.5, outras: 7.5 }; const overall = Math.round((Object.keys(progress) as DimensionKey[]).reduce((sum, k) => sum + progress[k] * weights[k] / 100, 0)); setDraft({ ...draft, progress, overall }); }} /></label>)}</div>
        <div className="drawerFooter"><button className="secondaryButton" onClick={onClose} type="button">Cancelar</button><button className="primaryButton" onClick={() => onSave(draft)} type="button">Salvar alterações</button></div>
      </aside>
    </div>
  );
}

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [selectedMetric, setSelectedMetric] = useState<StageKey>("adesao");
  const [selectedDiocese, setSelectedDiocese] = useState<Diocese | null>(null);
  const [query, setQuery] = useState("");
  const [regional, setRegional] = useState("Todos");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error ?? "Falha ao atualizar");
      setData(next);
      setNotice("Dados atualizados.");
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
    return matchesText && matchesRegional;
  }), [data.dioceses, query, regional]);

  const regionals = useMemo(() => ["Todos", ...Array.from(new Set(data.dioceses.map((d) => d.regional).filter((v) => v !== "—"))).sort()], [data.dioceses]);

  const donutOption = useMemo<EChartsOption>(() => ({
    animationDuration: 450,
    tooltip: { trigger: "item", formatter: "{b}<br/><b>{c}</b> dioceses · {d}%" },
    series: [{
      type: "pie", radius: ["62%", "82%"], center: ["36%", "50%"], avoidLabelOverlap: true,
      itemStyle: { borderColor: "#fff", borderWidth: 4, borderRadius: 5 }, label: { show: false },
      data: [
        { value: data.faithful.complete, name: "100% concluído", itemStyle: { color: BLUE } },
        { value: data.faithful.inProgress, name: "Em andamento", itemStyle: { color: BLUE_2 } },
        { value: data.faithful.notStarted, name: "Não iniciado", itemStyle: { color: "#dfe8f1" } },
      ],
    }],
    graphic: [{ type: "text", left: "25%", top: "40%", style: { text: `${data.faithful.average}%`, fill: TEXT, fontSize: 26, fontWeight: 700 } }, { type: "text", left: "23%", top: "54%", style: { text: "completude média", fill: MUTED, fontSize: 12 } }],
  }), [data.faithful]);

  const lineOption = useMemo<EChartsOption>(() => ({
    animationDuration: 500,
    tooltip: { trigger: "axis", backgroundColor: "#102f4c", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, textStyle: { color: MUTED } },
    grid: { left: 42, right: 18, top: 25, bottom: 48 },
    xAxis: { type: "category", boundaryGap: false, data: data.evolution.map((p) => p.label), axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED } },
    yAxis: { type: "value", min: 0, axisLabel: { color: MUTED }, splitLine: { lineStyle: { color: GRID } } },
    series: [
      { name: "Estruturação inicial", type: "line", smooth: true, symbolSize: 8, data: data.evolution.map((p) => p.estruturacao), lineStyle: { width: 3, color: BLUE }, itemStyle: { color: BLUE }, areaStyle: { color: "rgba(7,125,204,.06)" } },
      { name: "Dados de Fiéis", type: "line", smooth: true, symbolSize: 8, data: data.evolution.map((p) => p.fieis), lineStyle: { width: 3, color: BLUE_2 }, itemStyle: { color: BLUE_2 } },
      { name: "Homologação final", type: "line", smooth: true, symbolSize: 8, data: data.evolution.map((p) => p.homologacao), lineStyle: { width: 3, color: BLUE_3 }, itemStyle: { color: BLUE_3 } },
    ],
  }), [data.evolution]);

  async function saveDiocese(next: Diocese) {
    setData((prev) => ({ ...prev, dioceses: prev.dioceses.map((d) => d.id === next.id ? next : d) }));
    setSelectedDiocese(null);
    if (data.source === "trello") {
      try {
        const secret = window.prompt("Informe o segredo de escrita configurado no ambiente da Vercel:");
        if (!secret) return;
        const response = await fetch(`/api/dioceses/${next.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-dashboard-write-secret": secret }, body: JSON.stringify({ progress: next.progress }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Falha ao salvar");
        setNotice("Percentuais atualizados no Trello.");
        await refresh();
      } catch (e) { setNotice(e instanceof Error ? e.message : "Falha ao salvar"); }
    } else {
      setNotice("Alteração aplicada no modo demonstração. Ao recarregar a página, os mocks originais retornam.");
    }
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark">✦</div><div><b>CDIC-BR</b><span>Acompanhamento da implantação</span></div></div>
        <nav><a className="active">▣ <span>Painel</span></a><a>◆ <span>Dioceses</span></a><a>☷ <span>Etapas</span></a><a>▥ <span>Relatórios</span></a></nav>
        <div className="sideFooter">Painel de acompanhamento<br/><small>Fonte principal: Trello</small></div>
      </aside>
      <main>
        <header className="topbar"><div><h1>Painel de Acompanhamento</h1><p>Dados atualizados em {formatDate(data.updatedAt, true)} · Fonte: {data.source === "trello" ? "Trello" : "demonstração"}</p></div><button className="primaryButton" onClick={refresh} disabled={loading} type="button">↻ {loading ? "Atualizando…" : "Atualizar agora"}</button></header>
        {notice && <div className="notice" onClick={() => setNotice(null)}>{notice}<span>×</span></div>}
        <section className="filters"><label>Regional<select value={regional} onChange={(e) => setRegional(e.target.value)}>{regionals.map((v) => <option key={v}>{v}</option>)}</select></label><label>Etapa<select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value as StageKey)}>{data.metrics.map((m) => <option value={m.key} key={m.key}>{m.label}</option>)}</select></label><label>Período<select defaultValue="6m"><option value="30d">30 dias</option><option value="3m">3 meses</option><option value="6m">6 meses</option><option value="all">Todo período</option></select></label><label className="searchLabel">Buscar diocese<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite o nome…" /></label></section>
        <section className="metricsGrid">{data.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} onOpen={() => setSelectedMetric(metric.key)} />)}</section>
        <section className="dashboardGrid">
          <div className="leftColumn">
            <div className="chartGrid">
              <section className="panel"><div className="sectionTitle"><div><span className="eyebrow">COMPLETUDE</span><h2>Dados de Fiéis <Info text="A média considera o percentual informado em cada diocese. Fiéis tem maior peso no índice geral, mas 100% em todas as dimensões continua sendo necessário para homologação final." /></h2></div></div><div className="donutLayout"><EChart option={donutOption} height={260}/><div className="legendList"><span><i style={{ background: BLUE }} />100% concluído <b>{data.faithful.complete}</b></span><span><i style={{ background: BLUE_2 }} />Em andamento <b>{data.faithful.inProgress}</b></span><span><i style={{ background: "#dfe8f1" }} />Não iniciado <b>{data.faithful.notStarted}</b></span></div></div></section>
              <section className="panel"><div className="sectionTitle"><div><span className="eyebrow">CRESCIMENTO</span><h2>Evolução da implantação <Info text="O gráfico mostra os pontos disponíveis por data. No modo Trello sem armazenamento histórico, somente a fotografia atual é retornada; os dados simulados demonstram como a série ficará." /></h2></div></div><EChart option={lineOption} height={300}/></section>
            </div>
            <section className="panel"><div className="sectionTitle"><div><span className="eyebrow">COMPLETUDE MÉDIA</span><h2>Avanço por dimensão</h2></div><span className="pill">Fiéis = 50% do índice</span></div><div className="dimensionList">{data.dimensions.map((dim) => <div className={`dimensionRow ${dim.key === "fieis" ? "important" : ""}`} key={dim.key}><span>{dim.label}{dim.key === "fieis" && <small>Maior relevância</small>}</span><div className="progressTrack"><i style={{ width: `${dim.value}%` }} /></div><b>{dim.value}%</b></div>)}</div></section>
            <section className="panel tablePanel"><div className="sectionTitle"><div><span className="eyebrow">DRILL-DOWN</span><h2>Dioceses</h2></div><span className="muted">{filtered.length} exibidas</span></div><div className="tableWrap"><table><thead><tr><th>Diocese</th><th>Regional</th><th>Etapa predominante</th><th>Avanço geral</th><th>Fiéis</th><th>Atualização</th></tr></thead><tbody>{filtered.slice(0, 12).map((d) => <tr key={d.id} onClick={() => setSelectedDiocese(d)}><td><b>{d.name}</b></td><td>{d.regional}</td><td><span className="stageTag">{d.stageLabel}</span></td><td><div className="inlineProgress"><div className="progressTrack"><i style={{ width: `${d.overall}%` }} /></div><b>{d.overall}%</b></div></td><td>{d.progress.fieis}%</td><td>{formatDate(d.updatedAt)}</td></tr>)}</tbody></table></div></section>
          </div>
          <AdoptionPanel data={data.adoption} />
        </section>
        <footer className="pageFooter">Atualização automática configurada a cada 1 hora enquanto o painel estiver aberto. <b>{data.source === "mock" ? "Modo demonstração ativo." : "Conectado ao Trello."}</b></footer>
      </main>
      {selectedDiocese && <DioceseDrawer diocese={selectedDiocese} onClose={() => setSelectedDiocese(null)} onSave={saveDiocese} />}
    </div>
  );
}
