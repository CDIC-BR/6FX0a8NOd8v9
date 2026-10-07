import { NextResponse } from "next/server";
import { getTrelloDashboard } from "@/lib/trello";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = (process.env.TRELLO_MODE ?? "mock").toLowerCase();
  if (mode !== "trello") {
    return NextResponse.json({ ok: false, mode, message: "TRELLO_MODE não está definido como trello." }, { status: 400 });
  }

  try {
    const data = await getTrelloDashboard();
    return NextResponse.json({
      ok: true,
      boardId: process.env.TRELLO_BOARD_ID ?? null,
      totalCards: data.total,
      source: data.source,
      updatedAt: data.updatedAt,
      stages: Object.fromEntries(data.metrics.map((metric) => [metric.key, metric.value])),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
