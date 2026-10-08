import { NextResponse } from "next/server";
import { buildDashboard } from "@/lib/dashboard";
import { getRuntimeConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const config = getRuntimeConfig();
  const data = await buildDashboard();

  return NextResponse.json(
    {
      ok: data.source === "trello",
      appVersion: config.appVersion,
      mode: config.mode,
      source: data.source,
      environment: config.vercelEnv ?? "local",
      configuration: {
        apiKeyConfigured: config.apiKeyConfigured,
        tokenConfigured: config.tokenConfigured,
        credentialsConfigured: config.credentialsConfigured,
        boardId: config.boardId,
        homologacaoCompletaEnabled: config.homologacaoCompletaEnabled,
      },
      participantes: data.participantes,
      naoParticipantes: data.naoParticipantes,
      generatedAt: data.generatedAt,
      boardLastActivity: data.boardLastActivity,
      warning: data.warning ?? null,
      stages: Object.fromEntries(data.stages.map((s) => [s.rotulo, s.quantidade])),
      stageMapping: Object.fromEntries(data.stages.map((s) => [s.etapa, s.rotulo])),
    },
    { headers: { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate", "Pragma": "no-cache" } }
  );
}
