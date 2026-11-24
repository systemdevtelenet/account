import { getCurrentAccess } from "../../../lib/auth/access";
import { getEmployeeNotifications } from "../../../lib/supabase/notification-data";

export async function GET() {
  const access = await getCurrentAccess();
  // Keep authentication and authorization failures distinct for the client.
  if (access.status === "unauthenticated") {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }
  if (access.status === "denied") {
    return Response.json({ error: "You cannot access notifications." }, { status: 403 });
  }

  try {
    const data = await getEmployeeNotifications(access.actor.employeeId);
    // Notification data is user-specific and must not be cached by intermediaries.
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return Response.json({ error: "Could not load notifications." }, { status: 500 });
  }
}
