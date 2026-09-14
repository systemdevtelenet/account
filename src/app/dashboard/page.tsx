import { cookies } from "next/headers";
import Dashboard from "../../features/dashboard/Dashboard";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const initialDarkMode = cookieStore.get("dashboard-theme")?.value === "dark";

  return <Dashboard initialDarkMode={initialDarkMode} />;
}
