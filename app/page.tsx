import DashboardClient from "@/components/DashboardClient";
import { buildDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const initialData = await buildDashboard();
  return <DashboardClient initialData={initialData} />;
}
