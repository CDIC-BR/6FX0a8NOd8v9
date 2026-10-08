import { NextResponse } from "next/server";
import { buildDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await buildDashboard();
  return NextResponse.json({
    ok: data.source === "trello",
    source: data.source,
    participantes: data.participantes,
    naoParticipantes: data.naoParticipantes,
    generatedAt: data.generatedAt,
    boardLastActivity: data.boardLastActivity,
    warning: data.warning,
    stages: Object.fromEntries(data.stages.map((s) => [s.etapa, s.quantidade])),
  });
}
