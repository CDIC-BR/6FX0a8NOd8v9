import { NextResponse } from "next/server";
import { getRuntimeConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = getRuntimeConfig();
  return NextResponse.json(
    {
      ok: true,
      appVersion: config.appVersion,
      environment: config.vercelEnv ?? "local",
      trelloMode: config.mode,
      rawTrelloMode: config.rawMode,
      apiKeyConfigured: config.apiKeyConfigured,
      tokenConfigured: config.tokenConfigured,
      boardId: config.boardId,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
