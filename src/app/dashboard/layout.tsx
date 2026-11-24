import type { ReactNode } from "react";
import { requireDashboardUser } from "../../lib/auth/access";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Ensure only authenticated dashboard users can access this route tree.
  await requireDashboardUser();
  return children;
}
