import snapshot from "@/data/trello-snapshot.json";
import { getRuntimeConfig } from "@/lib/env";
import type { TrelloCard, TrelloList, TrelloSnapshot } from "@/lib/types";

const API = "https://api.trello.com/1";

async function trelloFetch<T>(path: string): Promise<T> {
  const config = getRuntimeConfig();
  if (!config.credentialsConfigured || !config.key || !config.token) {
    throw new Error(
      "Credenciais do Trello não configuradas. Defina TRELLO_API_KEY e TRELLO_TOKEN."
    );
  }

  const url = new URL(`${API}${path}`);
  url.searchParams.set("key", config.key);
  url.searchParams.set("token", config.token);

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Trello respondeu ${response.status}: ${body.slice(0, 180)}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchLiveSnapshot(): Promise<TrelloSnapshot> {
  const { boardId } = getRuntimeConfig();

  const [board, lists, cards] = await Promise.all([
    trelloFetch<{ id: string; name: string; shortLink: string; dateLastActivity?: string }>(
      `/boards/${encodeURIComponent(boardId)}?fields=id,name,shortLink,dateLastActivity`
    ),
    trelloFetch<TrelloList[]>(
      `/boards/${encodeURIComponent(boardId)}/lists?fields=id,name,closed&filter=open`
    ),
    trelloFetch<TrelloCard[]>(
      `/boards/${encodeURIComponent(boardId)}/cards?fields=id,name,idList,closed,labels,dateLastActivity,url&filter=open`
    ),
  ]);

  return {
    boardId: board.id,
    boardName: board.name,
    shortLink: board.shortLink,
    dateLastActivity: board.dateLastActivity,
    lists,
    cards,
  };
}

export async function getTrelloSnapshot(): Promise<{
  snapshot: TrelloSnapshot;
  source: "trello" | "snapshot";
  warning?: string;
}> {
  const config = getRuntimeConfig();

  if (config.mode === "snapshot") {
    return {
      snapshot: snapshot as TrelloSnapshot,
      source: "snapshot",
      warning: "Modo snapshot foi solicitado por TRELLO_MODE.",
    };
  }

  try {
    const live = await fetchLiveSnapshot();
    return { snapshot: live, source: "trello" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    return {
      snapshot: snapshot as TrelloSnapshot,
      source: "snapshot",
      warning: `Não foi possível consultar o Trello em tempo real. Exibindo o snapshot incluído no projeto. ${message}`,
    };
  }
}
