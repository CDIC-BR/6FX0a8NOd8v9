import { NextResponse } from "next/server";
import { buildDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const data = await buildDashboard();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
