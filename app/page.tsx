import DashboardClient from "@/components/DashboardClient";
import { getMockDashboard } from "@/lib/mock";
import { getTrelloDashboard } from "@/lib/trello";

export const dynamic = "force-dynamic";

export default async function Page() {
  const mode = (process.env.TRELLO_MODE ?? "mock").toLowerCase();
  if (mode !== "trello") {
    return <DashboardClient initialData={getMockDashboard()} />;
  }

  try {
    return <DashboardClient initialData={await getTrelloDashboard()} />;
  } catch (error) {
    const fallback = getMockDashboard();
    fallback.connectionError = error instanceof Error ? error.message : "Falha ao conectar ao Trello.";
    return <DashboardClient initialData={fallback} />;
  }
}
