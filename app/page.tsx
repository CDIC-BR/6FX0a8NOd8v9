import DashboardClient from "@/components/DashboardClient";
import { getMockDashboard } from "@/lib/mock";
import { getTrelloDashboard } from "@/lib/trello";

export const dynamic = "force-dynamic";

export default async function Page() {
  const mode = (process.env.TRELLO_MODE ?? "mock").toLowerCase();
  let data;
  try {
    data = mode === "trello" ? await getTrelloDashboard() : getMockDashboard();
  } catch {
    data = getMockDashboard();
  }
  return <DashboardClient initialData={data} />;
}
