import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../supabase/admin";
import { createSupabaseServerClient } from "../supabase/server";

type AccessActor = {
  userId: string;
  employeeId: number;
  role: "admin" | "team-lead";
  accountCode: string | null;
  destination: string;
};

export type AccessResult =
  | { status: "unauthenticated" }
  | { status: "denied" }
  | { status: "allowed"; actor: AccessActor };

function normalizeRole(role: string) {
  return role.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeAccount(accountCode: string) {
  const normalized = accountCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized === "FLEX" ? "FLEXAR" : normalized;
}

export function isTeamLeadForAccount(actor: AccessActor, accountCode: string) {
  return actor.role !== "team-lead" || (
    actor.accountCode !== null &&
    normalizeAccount(actor.accountCode) === normalizeAccount(accountCode)
  );
}

async function resolveEmployeeId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userEmail: string | undefined,
  emailConfirmed: boolean,
) {
  // Auth identifies the signed-in user; the verified email maps that identity to an employee.
  if (!emailConfirmed || !userEmail) return null;

  const normalizedEmail = userEmail.trim().toLowerCase();
  const emailColumns = ["employee_email", "company_email", "personal_email"];
  const matches = await Promise.all(emailColumns.map((column) => admin
    .from("employees")
    .select("id")
    .eq(column, normalizedEmail)
    .limit(2)));
  if (matches.some(({ error }) => error)) return null;

  const employeeIds = new Set(matches.flatMap(({ data }) => (data ?? []).map(({ id }) => id)));
  return employeeIds.size === 1 ? [...employeeIds][0] : null;
}

function accountDestination(accountCode: string) {
  return `/dashboard/accounts/${encodeURIComponent(accountCode)}/roster-list`;
}

export async function resolveUserAccess(
  userId: string,
  userEmail?: string,
  emailConfirmed = false,
): Promise<AccessResult> {
  const admin = createSupabaseAdminClient();
  const employeeId = await resolveEmployeeId(admin, userEmail, emailConfirmed);
  if (!employeeId) return { status: "denied" };

  const { data: employees, error: employeeError } = await admin
    .from("employees")
    .select("role_id")
    .eq("id", employeeId)
    .limit(1);
  const roleId = employees?.[0]?.role_id;
  if (employeeError || !roleId) return { status: "denied" };

  const { data: roleRows, error: roleError } = await admin
    .from("roles")
    .select("role_name")
    .eq("role_id", roleId)
    .limit(1);
  const roleName = roleRows?.[0]?.role_name;
  if (roleError || !roleName) return { status: "denied" };

  const role = normalizeRole(String(roleName));

  if (role.endsWith("ADMIN")) {
    return {
      status: "allowed",
      actor: { userId, employeeId, role: "admin", accountCode: null, destination: "/dashboard" },
    };
  }

  const isTeamLead = ["TL", "TEAMLEAD", "TEAMLEADER"].includes(role);
  if (!isTeamLead) return { status: "denied" };

  const { data: assignments, error: assignmentError } = await admin
    .from("employee_assignments")
    .select("account_id,effective_from")
    .eq("employee_id", employeeId)
    .is("effective_to", null)
    .order("effective_from", { ascending: false, nullsFirst: false })
    .limit(1);
  const accountId = assignments?.[0]?.account_id;
  if (assignmentError || !accountId) return { status: "denied" };

  const { data: accounts, error: accountError } = await admin
    .from("accounts")
    .select("account_code")
    .eq("account_id", accountId)
    .eq("is_active", true)
    .limit(1);
  const accountCode = accounts?.[0]?.account_code;
  if (accountError || !accountCode) return { status: "denied" };

  return {
    status: "allowed",
    actor: {
      userId,
      employeeId,
      role: "team-lead",
      accountCode,
      destination: accountDestination(accountCode),
    },
  };
}

export const getCurrentAccess = cache(async (): Promise<AccessResult> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { status: "unauthenticated" };

    return await resolveUserAccess(
      data.user.id,
      data.user.email,
      Boolean(data.user.email_confirmed_at),
    );
  } catch {
    return { status: "denied" };
  }
});

export async function requireDashboardUser() {
  const access = await getCurrentAccess();
  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "denied") redirect("/login?error=unauthorized");
  return access.actor;
}

export async function requireAdminDashboard() {
  const actor = await requireDashboardUser();
  if (actor.role === "team-lead") redirect(actor.destination);
  return actor;
}

export async function requireAccountAccess(accountCode: string) {
  const actor = await requireDashboardUser();
  if (!isTeamLeadForAccount(actor, accountCode)) redirect(actor.destination);
  return actor;
}
