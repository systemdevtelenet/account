import { cookies } from "next/headers";
import Dashboard from "../../features/dashboard/Dashboard";
import { requireAdminDashboard } from "../../lib/auth/access";

export default async function DashboardPage() {
  // Enforce dashboard access on the server before reading or rendering its data.
  await requireAdminDashboard();
  const cookieStore = await cookies();
  // Seed the first render with the saved theme to avoid a light/dark flash.
  // Any value other than "dark" uses the default light theme.
  const initialDarkMode = cookieStore.get("dashboard-theme")?.value === "dark";

  return <Dashboard initialDarkMode={initialDarkMode} />;
}
