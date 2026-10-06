import { NextRequest, NextResponse } from "next/server";
import { updateTrelloProgress } from "@/lib/trello";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const mode = (process.env.TRELLO_MODE ?? "mock").toLowerCase();
  const body = await request.json();

  if (mode !== "trello") {
    // No modo mock a edição é mantida no estado do navegador; este retorno simula sucesso.
    return NextResponse.json({ ok: true, mode: "mock" });
  }

  const expected = process.env.DASHBOARD_WRITE_SECRET;
  const supplied = request.headers.get("x-dashboard-write-secret");
  if (!expected || supplied !== expected) {
    return NextResponse.json({ error: "Edição não autorizada." }, { status: 401 });
  }

  try {
    const result = await updateTrelloProgress(id, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
