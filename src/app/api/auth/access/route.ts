import { getCurrentAccess } from "../../../../lib/auth/access";

export async function GET() {
  const access = await getCurrentAccess();
  // Distinguish missing authentication from an authenticated account without access.
  if (access.status === "unauthenticated") {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }
  if (access.status === "denied") {
    return Response.json({ error: "This account has no dashboard access." }, { status: 403 });
  }

  return Response.json({
    destination: access.actor.destination,
    role: access.actor.role,
    accountCode: access.actor.accountCode,
    name: access.actor.employeeName,
    email: access.actor.email,
    avatarUrl: access.actor.avatarUrl,
  }, {
    // Access details are user-specific and should not be cached.
    headers: { "Cache-Control": "no-store" },
  });
}
