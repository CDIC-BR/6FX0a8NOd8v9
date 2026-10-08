import { NextResponse } from "next/server";
import { buildDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await buildDashboard();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
