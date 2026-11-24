import { getCurrentAccess, isTeamLeadForAccount } from "../../../../../lib/auth/access";
import { getAccountWorkforce, parseWorkforcePeriod } from "../../../../../lib/supabase/workforce-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  // Require an authenticated user before checking account-specific access.
  const access = await getCurrentAccess();
  if (access.status === "unauthenticated") {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  // Resolve the route parameter and ensure the caller leads this account's team.
  const { accountId } = await params;
  if (access.status === "denied" || !isTeamLeadForAccount(access.actor, accountId)) {
    return Response.json({ error: "You cannot access this account overview." }, { status: 403 });
  }

  try {
    // Load workforce data for the requested period and optional anchor date.
    const url = new URL(request.url);
    const period = parseWorkforcePeriod(url.searchParams.get("period"));
    const data = await getAccountWorkforce(accountId, period, url.searchParams.get("anchor"));
    if (!data) {
      return Response.json({ error: "No matching database account was found." }, { status: 404 });
    }

  // Keep account-specific workforce data out of shared and browser caches.
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return Response.json({ error: "Could not load this account overview." }, { status: 500 });
  }
}
