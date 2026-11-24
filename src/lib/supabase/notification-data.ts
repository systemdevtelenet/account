import "server-only";

import { createSupabaseAdminClient } from "./admin";

export type WorkforceNotification = {
  notification_id: number;
  title: string;
  description: string;
  read_at: string | null;
  created_at: string;
  action_url: string | null;
};

// The caller supplies the employee ID from the verified authorization result.
export async function getEmployeeNotifications(employeeId: number) {
  const supabase = createSupabaseAdminClient();

  const [notificationResult, unreadResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("notification_id,title,description,read_at,created_at,action_url")
      .eq("recipient_employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("notifications")
      .select("notification_id", { count: "exact", head: true })
      .eq("recipient_employee_id", employeeId)
      .is("read_at", null),
  ]);

  if (notificationResult.error || unreadResult.error) {
    throw new Error("Supabase could not load notifications.");
  }

  return {
    notifications: (notificationResult.data ?? []) as WorkforceNotification[],
    unreadCount: unreadResult.count ?? 0,
  };
}
