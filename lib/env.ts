export const APP_VERSION = "2026-10-08-detail-clean-4";

export type TrelloMode = "trello" | "snapshot";

export function getRuntimeConfig() {
  const rawMode = process.env.TRELLO_MODE?.trim().toLowerCase();
  const key = process.env.TRELLO_API_KEY?.trim();
  const token = process.env.TRELLO_TOKEN?.trim();
  const boardId = process.env.TRELLO_BOARD_ID?.trim() || "KaACdOVE";

  // Compatibilidade: TRELLO_MODE é opcional. Se não estiver definido,
  // tentamos Trello sempre que as credenciais existirem.
  const snapshotRequested = ["snapshot", "mock", "off", "disabled"].includes(rawMode || "");
  const mode: TrelloMode = snapshotRequested ? "snapshot" : "trello";

  return {
    appVersion: APP_VERSION,
    mode,
    rawMode: rawMode || null,
    boardId,
    apiKeyConfigured: Boolean(key),
    tokenConfigured: Boolean(token),
    credentialsConfigured: Boolean(key && token),
    key,
    token,
    homologacaoCompletaEnabled:
      process.env.HOMOLOGACAO_COMPLETA_ENABLED?.trim().toLowerCase() === "true",
    vercelEnv: process.env.VERCEL_ENV || null,
    nodeEnv: process.env.NODE_ENV || null,
  };
}
