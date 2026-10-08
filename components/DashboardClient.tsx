"use client";

import { useEffect, useMemo, useState } from "react";
import type { CircunscricaoBase, DashboardPayload, DioceseDashboard, StageName, TrelloLabel } from "@/lib/types";

const STAGE_COLORS: Record<StageName, string> = {
  "Dioceses selecionadas": "#cbddea",
  "Em diálogo": "#8bc9ee",
  "Dados recebidos": "#55afe3",
  "Dados carregados": "#278fcf",
  "Homologação estrutural": "#077dcc",
  "Homologação completa": "#0b5f99",
};

const STAGE_COPY: Record<StageName, string> = {
  "Dioceses selecionadas": "Dioceses cujo cartão está atualmente na lista Dioceses selecionadas do Trello.",
  "Em diálogo": "Dioceses cujo cartão está atualmente na lista Em diálogo do Trello.",
  "Dados recebidos": "Dioceses cujo cartão está atualmente na lista Dados recebidos do Trello.",
  "Dados carregados": "Dioceses cujo cartão está atualmente na lista Dados carregados do Trello.",
  "Homologação estrutural": "Dioceses cujo cartão está atualmente na lista Homologação estrutural do Trello.",
  "Homologação completa": "Ainda não mensurável: após a homologação estrutural há envio completo + importação, e o importador ainda está em desenvolvimento.",
};

type DrawerItem = {
  id: string;
  nome: string;
  regional: string;
  provincia: string;
  grupo?: string;
  etapa?: StageName;
  termoAssinado?: boolean;
  labelDetails?: TrelloLabel[];
  trelloUrl?: string | null;
  ultimaAtividade?: string | null;
};

function pct(value: number, total: number) {
  return total ? (value / total) * 100 : 0;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function alphaSort<T extends { nome: string }>(items: T[]) {
  return [...items].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function asDrawerItem(item: DioceseDashboard): DrawerItem {
  return {
    id: item.id,
    nome: item.nome,
    regional: item.regional,
    provincia: item.provincia,
    grupo: item.grupo,
    etapa: item.etapa,
    termoAssinado: item.termoAssinado,
    labelDetails: item.labelDetails,
    trelloUrl: item.trelloUrl,
    ultimaAtividade: item.ultimaAtividade,
  };
}

function asBaseDrawerItem(item: CircunscricaoBase): DrawerItem {
  return {
    id: `base-${item.numero}-${item.nome}`,
    nome: item.nome,
    regional: item.regional,
    provincia: item.provincia,
  };
}

function activateOnKeyboard(event: React.KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

const LABEL_ORDER = [
  "Termo enviado",
  "Termo assinado",
  "Aguardando envio da divisão territorial",
  "Divisão recebida",
  "Divisão cadastrada",
  "Piloto",
];

function sortTrelloLabels(labels: TrelloLabel[] = []) {
  return [...labels].sort((a, b) => {
    const ai = LABEL_ORDER.indexOf(a.name);
    const bi = LABEL_ORDER.indexOf(b.name);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function termStatus(item: DrawerItem) {
  if (!item.labelDetails) return null;
  const names = item.labelDetails.map((label) => label.name);
  if (item.termoAssinado || names.includes("Termo assinado")) {
    return { label: "Termo assinado", tone: "signed" as const };
  }
  if (names.includes("Termo enviado")) {
    return { label: "Termo enviado · não assinado", tone: "pending" as const };
  }
  return { label: "Termo sem status identificado", tone: "unknown" as const };
}

export default function DashboardClient({ initialData }: { initialData: DashboardPayload }) {
  const [data, setData] = useState(initialData);
  const [regional, setRegional] = useState("Todos");
  const [provincia, setProvincia] = useState("Todas");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [drawer, setDrawer] = useState<{
    title: string;
    description?: string;
    items?: DrawerItem[];
  } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const fresh = (await response.json()) as DashboardPayload;
      setData(fresh);
      setToast(fresh.source === "trello" ? "Dados atualizados a partir do Trello." : "Atualizado com o snapshot local.");
    } catch {
      setToast("Não foi possível atualizar agora. Os dados exibidos foram mantidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = window.setInterval(refresh, 60 * 60 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const saved = window.localStorage.getItem("cdic-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const nextTheme = saved === "dark" || saved === "light" ? saved : preferred;
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("cdic-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  // Os filtros geográficos devem refletir toda a base de 281 circunscrições,
  // e não apenas as dioceses que já participam do processo CDIC-BR.
  // A união entre participantes e não participantes recompõe a base completa.
  const geographyBase = useMemo(
    () => [
      ...(data.naoParticipantesLista || []).map((item) => ({
        regional: item.regional,
        provincia: item.provincia,
      })),
      ...data.dioceses.map((item) => ({
        regional: item.regional,
        provincia: item.provincia,
      })),
    ],
    [data.naoParticipantesLista, data.dioceses]
  );

  const regionais = useMemo(
    () =>
      [...new Set(geographyBase.map((item) => item.regional).filter((item) => item && item !== "Não informado"))]
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [geographyBase]
  );

  const provincias = useMemo(() => {
    const base = regional === "Todos"
      ? geographyBase
      : geographyBase.filter((item) => item.regional === regional);

    return [...new Set(base.map((item) => item.provincia).filter((item) => item && item !== "Não informado"))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [geographyBase, regional]);

  useEffect(() => {
    if (provincia !== "Todas" && !provincias.includes(provincia)) setProvincia("Todas");
  }, [provincias, provincia]);

  const filtered = useMemo(
    () =>
      data.dioceses.filter(
        (d) => (regional === "Todos" || d.regional === regional) && (provincia === "Todas" || d.provincia === provincia)
      ),
    [data.dioceses, regional, provincia]
  );

  const total = filtered.length;
  const signedItems = alphaSort(filtered.filter((d) => d.termoAssinado));
  const signed = signedItems.length;
  const pilots = filtered.filter((d) => d.grupo === "Piloto");
  const structuralItems = alphaSort(filtered.filter((d) => d.etapaOrdem >= 5));
  const structural = structuralItems.length;

  // O KPI de não participantes deve responder aos mesmos filtros de Regional e Província.
  // A lista já contém apenas circunscrições fora do processo; aqui filtramos o universo geográfico.
  const filteredNonParticipantsBase = useMemo(
    () =>
      (data.naoParticipantesLista || []).filter(
        (item) =>
          (regional === "Todos" || item.regional === regional) &&
          (provincia === "Todas" || item.provincia === provincia)
      ),
    [data.naoParticipantesLista, regional, provincia]
  );
  const nonParticipants = alphaSort(filteredNonParticipantsBase.map(asBaseDrawerItem));
  const nonParticipantsCount = nonParticipants.length;
  const baseTotalFiltered = nonParticipantsCount + total;

  const stageSummaries = data.stages.map((stage) => {
    if (!stage.disponivel) return { ...stage, quantidade: null, percentual: null };
    const quantidade = filtered.filter((d) => d.etapa === stage.etapa).length;
    return { ...stage, quantidade, percentual: pct(quantidade, total) };
  });

  const donutGradient = useMemo(() => {
    let cursor = 0;
    const parts: string[] = [];
    for (const stage of stageSummaries) {
      if (!stage.disponivel || !stage.quantidade || !total) continue;
      const next = cursor + (stage.quantidade / total) * 100;
      parts.push(`${STAGE_COLORS[stage.etapa]} ${cursor}% ${next}%`);
      cursor = next;
    }
    if (cursor < 100) parts.push(`#eef3f7 ${cursor}% 100%`);
    return `conic-gradient(${parts.join(", ")})`;
  }, [stageSummaries, total]);

  const regionalSummary = useMemo(() => {
    const map = new Map<string, DioceseDashboard[]>();
    for (const d of filtered) {
      const list = map.get(d.regional) || [];
      list.push(d);
      map.set(d.regional, list);
    }
    return [...map.entries()]
      .map(([name, items]) => ({
        name,
        items: alphaSort(items),
        total: items.length,
        dialogo: items.filter((d) => d.etapa === "Em diálogo").length,
        dadosPlus: items.filter((d) => d.etapaOrdem >= 3).length,
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
  }, [filtered]);

  const maxRegional = Math.max(1, ...regionalSummary.map((r) => r.total));
  const dialogueNoData = alphaSort(filtered.filter((d) => d.etapa === "Em diálogo"));
  const pilotNoActive = alphaSort(filtered.filter((d) => d.grupo === "Piloto" && d.etapa === "Dados carregados"));
  const pendingTerms = alphaSort(filtered.filter((d) => !d.termoAssinado));
  const pilotStructural = alphaSort(pilots.filter((d) => d.etapaOrdem >= 5));
  const pilotLoaded = alphaSort(pilots.filter((d) => d.etapa === "Dados carregados"));
  const pilotSigned = alphaSort(pilots.filter((d) => d.termoAssinado));

  const drawerDetailSummary = useMemo(() => {
    const items = drawer?.items || [];
    const trelloItems = items.filter((item) => item.labelDetails !== undefined);
    if (!trelloItems.length) return null;

    const labelCounts = new Map<string, { name: string; color?: string | null; count: number }>();
    let signedCount = 0;
    let unsignedSentCount = 0;
    let unknownTermCount = 0;

    for (const item of trelloItems) {
      const status = termStatus(item);
      if (status?.tone === "signed") signedCount += 1;
      else if (status?.tone === "pending") unsignedSentCount += 1;
      else unknownTermCount += 1;

      for (const label of item.labelDetails || []) {
        if (!label.name) continue;
        const existing = labelCounts.get(label.name);
        labelCounts.set(label.name, {
          name: label.name,
          color: label.color,
          count: (existing?.count || 0) + 1,
        });
      }
    }

    const labels = [...labelCounts.values()].sort((a, b) => {
      const ai = LABEL_ORDER.indexOf(a.name);
      const bi = LABEL_ORDER.indexOf(b.name);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });

    return { signedCount, unsignedSentCount, unknownTermCount, labels, total: trelloItems.length };
  }, [drawer]);

  function openList(title: string, items: Array<DioceseDashboard | DrawerItem>, description?: string) {
    const normalized = items.map((item) => ("labels" in item ? asDrawerItem(item as DioceseDashboard) : item as DrawerItem));
    setDrawer({ title, description, items: alphaSort(normalized) });
  }

  function openInfo(title: string, description: string) {
    setDrawer({ title, description, items: [] });
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <img className="brand-logo" src="/logo.svg" alt="CDIC-BR" />
          <div className="brand-copy">
            <strong>CDIC-BR</strong>
            <span>Acompanhamento</span>
          </div>
          <button className="collapse-button desktop-only" onClick={() => setSidebarCollapsed((v) => !v)} aria-label="Recolher menu">
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <button className="active" aria-current="page"><span className="nav-icon">▣</span><span className="nav-label">Visão geral</span></button>
        </nav>

        <div className="sidebar-source">
          <span className={`source-dot ${data.source === "trello" ? "live" : "snapshot"}`} />
          <span>{data.sourceLabel}</span>
        </div>
      </aside>

      <header className="mobile-header">
        <div className="mobile-brand"><img src="/logo.svg" alt="" /><strong>CDIC-BR</strong></div>
        <button className="mobile-theme-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
          {theme === "dark" ? "☀" : "◐"}
        </button>
      </header>

      <main className="main-content">
        <section className="page-header">
          <div>
            <div className="eyebrow">GESTÃO DE PARTICIPAÇÃO</div>
            <h1>Acompanhamento da participação das dioceses</h1>
          </div>
          <div className="header-actions">
            <button className="theme-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
              <span aria-hidden>{theme === "dark" ? "☀" : "◐"}</span>
              <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
            </button>
            <div className="source-pill">
              <span className={`source-dot ${data.source === "trello" ? "live" : "snapshot"}`} />
              {data.sourceLabel}
            </div>
            <button className="refresh-button" onClick={refresh} disabled={loading}>{loading ? "Atualizando…" : "↻ Atualizar"}</button>
          </div>
        </section>

        {data.warning && <div className="warning-banner"><strong>Atenção:</strong> {data.warning}</div>}

        <section className="filter-row" aria-label="Filtros do painel">
          <div className="filter-box">
            <label htmlFor="regional">Regional</label>
            <select id="regional" value={regional} onChange={(e) => setRegional(e.target.value)}>
              <option value="Todos">Todos os regionais</option>
              {regionais.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="filter-box">
            <label htmlFor="provincia">Província</label>
            <select id="provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)}>
              <option value="Todas">Todas as províncias</option>
              {provincias.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="updated-box">
            <span>Atualização do painel</span>
            <strong>{formatDate(data.generatedAt)}</strong>
          </div>
        </section>

        <section className="kpi-grid">
          <button
            className="kpi-card"
            onClick={() =>
              openList(
                "Circunscrições não participantes",
                nonParticipants,
                regional === "Todos" && provincia === "Todas"
                  ? "Circunscrições da base que não participam atualmente do processo CDIC-BR."
                  : "Circunscrições não participantes considerando os filtros de Regional e Província aplicados no painel."
              )
            }
          >
            <span>Circunscrições não participantes</span>
            <strong>{nonParticipantsCount}</strong>
            <small>
              {regional === "Todos" && provincia === "Todas"
                ? `${data.baseTotal} totais − ${data.participantes} participantes`
                : `${baseTotalFiltered} no filtro − ${total} participantes`}
            </small>
          </button>
          <button className="kpi-card primary" onClick={() => openList("Participantes do processo CDIC-BR", filtered, "Dioceses participantes do processo CDIC-BR considerando os filtros aplicados no painel.")}>
            <span>Participantes do processo CDIC-BR</span>
            <strong>{total}</strong>
            <small>{regional === "Todos" && provincia === "Todas" ? `${data.participantes} participantes no projeto` : "Filtro aplicado"}</small>
          </button>
          <button className="kpi-card" onClick={() => openList("Termos assinados", signedItems, "Dioceses participantes com a etiqueta Termo assinado no Trello.")}>
            <span>Termos assinados</span>
            <strong>{signed}</strong>
            <small>{total ? `${pct(signed, total).toFixed(1).replace(".", ",")}% das participantes` : "—"}</small>
          </button>
          <button className="kpi-card" onClick={() => openList("Estrutura homologada", structuralItems, "Dioceses na etapa Homologação estrutural ou posterior.")}>
            <span>Estrutura homologada</span>
            <strong>{structural}</strong>
            <small>{total ? `${pct(structural, total).toFixed(1).replace(".", ",")}% das participantes` : "—"}</small>
          </button>
        </section>

        <section className="panel flow-panel" id="etapas">
          <div className="panel-heading">
            <div><h2>Etapa atual predominante</h2></div>
          </div>
          <div className="stage-flow">
            {stageSummaries.map((stage, index) => {
              const items = filtered.filter((d) => d.etapa === stage.etapa);
              const action = () => stage.disponivel
                ? openList(stage.etapa, items, STAGE_COPY[stage.etapa])
                : openInfo(stage.etapa, STAGE_COPY[stage.etapa]);
              return (
                <article
                  className={`stage-card clickable-card ${!stage.disponivel ? "unavailable" : ""}`}
                  key={stage.etapa}
                  role="button"
                  tabIndex={0}
                  onClick={action}
                  onKeyDown={(event) => activateOnKeyboard(event, action)}
                  aria-label={`Abrir detalhamento de ${stage.etapa}`}
                >
                  <div className="stage-title-row">
                    <span>{stage.etapa}</span>
                    <span className="info-badge" title={STAGE_COPY[stage.etapa]} aria-label={STAGE_COPY[stage.etapa]}>i</span>
                  </div>
                  <strong className="stage-number">{stage.disponivel ? stage.quantidade : "N/D"}</strong>
                  <span className="stage-percent">{stage.disponivel ? `${Math.round(stage.percentual || 0)}% das participantes` : "Ainda não mensurável"}</span>
                  <div className="progress-track"><div style={{ width: `${stage.percentual || 0}%` }} /></div>
                  {index < stageSummaries.length - 1 && <span className="stage-arrow" aria-hidden>→</span>}
                </article>
              );
            })}
          </div>
        </section>

        <section className="two-column-grid">
          <article className="panel donut-panel">
            <div className="panel-heading"><div><h2>Distribuição por etapa</h2></div></div>
            <div className="donut-layout">
              <div className="donut" style={{ background: donutGradient }}>
                <div className="donut-hole"><strong>{total}</strong><span>dioceses no<br />processo</span></div>
              </div>
              <div className="legend-list">
                {stageSummaries.map((stage) => {
                  const items = filtered.filter((d) => d.etapa === stage.etapa);
                  return (
                    <button
                      className={`legend-row ${!stage.disponivel ? "disabled" : ""}`}
                      key={stage.etapa}
                      onClick={() => stage.disponivel ? openList(stage.etapa, items, STAGE_COPY[stage.etapa]) : openInfo(stage.etapa, STAGE_COPY[stage.etapa])}
                    >
                      <span><i style={{ background: stage.disponivel ? STAGE_COLORS[stage.etapa] : "#eef3f7" }} />{stage.etapa}</span>
                      <strong>{stage.disponivel ? `${stage.quantidade} · ${Math.round(stage.percentual || 0)}%` : "N/D"}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="panel pilot-panel">
            <div className="panel-heading"><div><h2>Dioceses piloto</h2></div></div>
            <div className="pilot-grid">
              <PilotCard value={`${pilots.length}/${total}`} label="dioceses piloto dentre as participantes" onClick={() => openList("Dioceses piloto", pilots)} />
              <PilotCard value={`${pilotStructural.length}/${pilots.length || 0}`} label={`estrutura homologada · ${pilots.length ? Math.round(pct(pilotStructural.length, pilots.length)) : 0}%`} onClick={() => openList("Piloto · estrutura homologada", pilotStructural)} />
              <PilotCard value={`${pilotLoaded.length}/${pilots.length || 0}`} label="ainda na etapa de dados carregados · sem diálogo" onClick={() => openList("Piloto · dados carregados e sem diálogo", pilotLoaded)} />
              <PilotCard value={`${pilotSigned.length}/${pilots.length || 0}`} label="termos assinados" onClick={() => openList("Piloto · termos assinados", pilotSigned)} />
            </div>
            <div className="pilot-note"><strong>Observação:</strong> o grupo piloto integra o panorama geral, mas ingressou antes do fluxo atual e pode aparecer diretamente em etapas avançadas.</div>
          </article>
        </section>

        <section className="two-column-grid bottom-grid">
          <article className="panel" id="regionais">
            <div className="panel-heading"><div><h2>Participação por Regional</h2></div></div>
            <div className="regional-list">
              {regionalSummary.map((item) => (
                <button className="regional-row" key={item.name} onClick={() => openList(`Regional ${item.name}`, item.items)}>
                  <strong>{item.name}</strong>
                  <div className="regional-track" title={`${item.total} participante(s)`}><div style={{ width: `${(item.total / maxRegional) * 100}%` }} /></div>
                  <div className="badges"><span>{item.total} projeto</span><span>{item.dialogo} diálogo</span><span>{item.dadosPlus} dados+</span></div>
                </button>
              ))}
            </div>
          </article>

          <article className="panel attention-panel">
            <div className="panel-heading"><div><h2>Pontos de atenção para a liderança</h2></div></div>
            <div className="attention-list">
              <AttentionItem number={dialogueNoData.length} title="Em diálogo, mas sem avanço para envio de dados" text="Dioceses em articulação que ainda não avançaram para Dados recebidos." onClick={() => openList("Em diálogo sem avanço para dados", dialogueNoData)} />
              <AttentionItem number={pilotNoActive.length} title="Dioceses piloto sem contato ativo" text="Pilotos que permanecem na etapa de Dados carregados na fotografia atual." onClick={() => openList("Piloto sem contato ativo", pilotNoActive)} />
              <AttentionItem number={pendingTerms.length} title="Termos ainda não assinados" text={`${signed} de ${total} participantes do processo CDIC-BR têm termo assinado.`} onClick={() => openList("Dioceses sem termo assinado", pendingTerms)} />
              <AttentionItem number="—" title="Homologação completa ainda não é mensurável" text="Após a estrutura ser validada, ainda há envio completo + importação. O importador permanece em desenvolvimento." onClick={() => openInfo("Homologação completa", STAGE_COPY["Homologação completa"])} />
            </div>
          </article>
        </section>

        <footer className="page-footer">
          <span>Fonte: {data.sourceLabel}</span>
          <span>Última atividade do board: {formatDate(data.boardLastActivity)}</span>
        </footer>
      </main>

      {drawer && (
        <>
          <button className="drawer-overlay" aria-label="Fechar detalhamento" onClick={() => setDrawer(null)} />
          <aside className="drawer" aria-label="Detalhamento">
            <div className="drawer-header">
              <div><span className="eyebrow">DETALHAMENTO</span><h3>{drawer.title}</h3></div>
              <button onClick={() => setDrawer(null)} aria-label="Fechar">×</button>
            </div>
            {drawer.description && <p className="drawer-description">{drawer.description}</p>}
            <div className="drawer-count">{drawer.items?.length || 0} circunscrição(ões)</div>
            {drawerDetailSummary && (
              <div className="drawer-detail-summary">
                <div className="term-summary">
                  {drawerDetailSummary.signedCount > 0 && <span className="summary-pill signed">{drawerDetailSummary.signedCount} termo assinado</span>}
                  {drawerDetailSummary.unsignedSentCount > 0 && <span className="summary-pill pending">{drawerDetailSummary.unsignedSentCount} termo não assinado</span>}
                  {drawerDetailSummary.unknownTermCount > 0 && <span className="summary-pill neutral">{drawerDetailSummary.unknownTermCount} termo sem status</span>}
                </div>
                {drawerDetailSummary.labels.length > 0 && (
                  <div className="drawer-tag-summary">
                    {drawerDetailSummary.labels.map((label) => (
                      <span className="trello-tag summary-tag" data-color={label.color || "default"} key={label.name}>
                        {label.name} <b>{label.count}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="drawer-list">
              {(drawer.items || []).map((item) => (
                <article className="drawer-item" key={item.id}>
                  <div className="drawer-item-top">
                    <strong>{item.nome}</strong>
                    {item.etapa && <span className="stage-chip">{item.etapa}</span>}
                  </div>
                  <div className="drawer-meta">
                    <span><b>Regional:</b> {item.regional}</span>
                    <span><b>Província:</b> {item.provincia}</span>
                    {item.grupo && <span><b>Grupo:</b> {item.grupo}</span>}
                    {item.ultimaAtividade && <span><b>Última atividade:</b> {formatDate(item.ultimaAtividade)}</span>}
                  </div>
                  {item.labelDetails !== undefined && (
                    <div className="trello-detail-block">
                      {(() => {
                        const status = termStatus(item);
                        return status ? (
                          <div className={`term-status ${status.tone}`}>
                            <span>Situação do termo</span>
                            <strong>{status.label}</strong>
                          </div>
                        ) : null;
                      })()}
                      <div className="trello-labels">
                        <span className="trello-labels-title">Etiquetas do Trello</span>
                        <div className="trello-label-list">
                          {sortTrelloLabels(item.labelDetails).length ? sortTrelloLabels(item.labelDetails).map((label) => (
                            <span className="trello-tag" data-color={label.color || "default"} key={label.id || label.name}>{label.name}</span>
                          )) : <span className="no-labels">Nenhuma etiqueta aplicada</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </aside>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function PilotCard({ value, label, onClick }: { value: string; label: string; onClick: () => void }) {
  return (
    <button className="pilot-card" onClick={onClick}>
      <strong>{value}</strong><span>{label}</span>
    </button>
  );
}

function AttentionItem({ number, title, text, onClick }: { number: number | string; title: string; text: string; onClick: () => void }) {
  return (
    <button className="attention-item" onClick={onClick}>
      <div className="attention-number">{number}</div>
      <div><strong>{title}</strong><p>{text}</p></div>
    </button>
  );
}
