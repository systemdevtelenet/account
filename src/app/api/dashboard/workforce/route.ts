import { getCurrentAccess } from "../../../../lib/auth/access";
import { getDashboardWorkforce, parseWorkforcePeriod } from "../../../../lib/supabase/workforce-data";

export async function GET(request: Request) {
  const access = await getCurrentAccess();
  // Distinguish missing authentication from an authenticated user without admin access.
  if (access.status === "unauthenticated") {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }
  if (access.status === "denied" || access.actor.role !== "admin") {
    return Response.json({ error: "You cannot access workforce analytics." }, { status: 403 });
  }

  try {
    // Normalize the requested period before loading the corresponding workforce data.
    const url = new URL(request.url);
    const period = parseWorkforcePeriod(url.searchParams.get("period"));
    const data = await getDashboardWorkforce(period, url.searchParams.get("anchor"));
    return Response.json(data, {
      // Workforce analytics are private and must not be stored by caches.
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return Response.json({ error: "Could not load workforce analytics." }, { status: 500 });
  }
}
