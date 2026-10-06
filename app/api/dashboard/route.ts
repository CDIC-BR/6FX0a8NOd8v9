import { NextResponse } from "next/server";
import { getMockDashboard } from "@/lib/mock";
import { getTrelloDashboard } from "@/lib/trello";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = (process.env.TRELLO_MODE ?? "mock").toLowerCase();
  try {
    const data = mode === "trello" ? await getTrelloDashboard() : getMockDashboard();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
