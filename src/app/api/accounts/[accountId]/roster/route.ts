import { getAccountRoster } from "../../../../../lib/supabase/roster-data";
import { getCurrentAccess, isTeamLeadForAccount } from "../../../../../lib/auth/access";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await params;
    const access = await getCurrentAccess();
    // Require a signed-in team lead before exposing account roster data.
    if (access.status === "unauthenticated") {
      return Response.json({ error: "Sign in is required." }, { status: 401 });
    }
    if (access.status === "denied" || !isTeamLeadForAccount(access.actor, accountId)) {
      return Response.json({ error: "You cannot access this account roster." }, { status: 403 });
    }

    const roster = await getAccountRoster(accountId);
    // An empty account name indicates that the requested account does not exist.
    if (!roster.accountName) {
      return Response.json({ error: "No matching database account was found." }, { status: 404 });
    }

    // Roster data is user-specific and should not be cached by intermediaries.
    return Response.json({ ...roster, canManage: access.actor.role === "admin" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load the account roster from the local database." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "This request must come from Operation System." }, { status: 403 });
  }

  const access = await getCurrentAccess();
  if (access.status === "unauthenticated") return Response.json({ error: "Sign in is required." }, { status: 401 });
  if (access.status !== "allowed" || access.actor.role !== "admin") {
    return Response.json({ error: "Only administrators can change roster records." }, { status: 403 });
  }

  try {
    const { accountId } = await params;
    const roster = await getAccountRoster(accountId);
    if (!roster.accountId) return Response.json({ error: "Account was not found." }, { status: 404 });

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Invalid action details." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const employeeId = input.employeeId;
    const action = input.action;
    const effectiveDate = input.effectiveDate;
    const reason = input.reason;
    const toPositionId = input.toPositionId;
    const parsedDate = typeof effectiveDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
      ? new Date(`${effectiveDate}T00:00:00Z`)
      : null;
    if (!Number.isSafeInteger(employeeId) || !roster.employees.some((employee) => employee.id === employeeId) ||
        (action !== "offboard" && action !== "promote") ||
        !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== effectiveDate ||
        (action === "offboard" && !["RESIGNED", "AWOL", "TERMINATED", "ACCOUNT REMOVED", "REPROFILED"].includes(String(reason))) ||
        (action === "promote" && (!Number.isSafeInteger(toPositionId) || !roster.positions.some((position) => position.position_id === toPositionId)))) {
      return Response.json({ error: "Choose an employee, date, and valid action details." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("record_roster_movement", {
      p_account_id: roster.accountId,
      p_employee_id: employeeId,
      p_action: action,
      p_effective_date: effectiveDate,
      p_reason: action === "offboard" ? reason : null,
      p_to_position_id: action === "promote" ? toPositionId : null,
      p_actor_employee_id: access.actor.employeeId,
    });
    if (error) {
      const conflict = error.code === "P0002" || error.code === "22023";
      return Response.json({ error: conflict ? error.message : "Could not save this roster action." }, { status: conflict ? 409 : 500 });
    }

    return Response.json({ movementId: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not save this roster action." }, { status: 500 });
  }
}
