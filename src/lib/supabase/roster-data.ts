import "server-only";

type SupabaseAccount = {
  account_id: number;
  account_code: string;
  account_name: string;
};

type SupabaseAssignment = {
  employee_id: number;
  effective_from: string | null;
  effective_to: string | null;
};

type SupabaseEmployee = {
  id: number;
  employee_code: string | null;
  employee_name: string | null;
  status_id: number | null;
  hire_date: string | null;
  position_id: number | null;
  site: string | null;
  Department: string | null;
};

type SupabasePosition = { position_id: number; position_name: string };
type SupabaseStatus = { status_id: number; status_name: string };
const PAGE_SIZE = 1_000;

export type AccountRosterRecord = {
  id: number;
  employeeCode: string;
  employeeName: string;
  position: string;
  positionId: number | null;
  department: string;
  site: string;
  hireDate: string;
  status: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing server-side Supabase configuration.");
  }

  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

async function selectRows<T>(table: string, query: Record<string, string>) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const rows: T[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({ ...query, limit: String(PAGE_SIZE), offset: String(offset) });
    const response = await fetch(`${url}/rest/v1/${table}?${params}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
        Prefer: "count=exact",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Supabase could not read ${table} (${response.status}).`);
    }

    const page = await response.json() as T[];
    rows.push(...page);
    const total = Number(response.headers.get("content-range")?.split("/")[1]);
    if (Number.isFinite(total) && offset + page.length >= total) return rows;
    if (!Number.isFinite(total) && page.length < PAGE_SIZE) return rows;
  }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function rosterStatus(statusName: string | undefined): AccountRosterRecord["status"] {
  return statusName || "Unknown";
}

/** Reads the current account roster from the existing Supabase tables. */
export async function getAccountRoster(accountSlug: string) {
  const accountCode = accountSlug.toLowerCase() === "flex" ? "FLEXAR" : accountSlug;
  const accounts = await selectRows<SupabaseAccount>("accounts", {
    select: "account_id,account_code,account_name",
    is_active: "eq.true",
    order: "account_id.asc",
  });
  const account = accounts.find((candidate) =>
    normalize(candidate.account_code) === normalize(accountCode) ||
    normalize(candidate.account_name) === normalize(accountSlug),
  );

  if (!account) return { accountId: null, accountName: null, employees: [] as AccountRosterRecord[], positions: [] as SupabasePosition[] };

  const assignments = await selectRows<SupabaseAssignment>("employee_assignments", {
    select: "employee_id,effective_from,effective_to",
    account_id: `eq.${account.account_id}`,
    effective_to: "is.null",
    order: "assignment_id.asc",
  });
  const now = Date.now();
  const currentAssignments = assignments.filter((assignment) =>
    !assignment.effective_from || Date.parse(assignment.effective_from) <= now,
  );
  const employeeIds = [...new Set(currentAssignments.map(({ employee_id }) => employee_id))];

  if (employeeIds.length === 0) {
    return { accountId: account.account_id, accountName: account.account_name, employees: [] as AccountRosterRecord[], positions: [] as SupabasePosition[] };
  }

  const idList = `in.(${employeeIds.join(",")})`;
  const [employees, positions, statuses] = await Promise.all([
    selectRows<SupabaseEmployee>("employees", {
      select: "id,employee_code,employee_name,status_id,hire_date,position_id,site,Department",
      id: idList,
    order: "id.asc",
    }),
    selectRows<SupabasePosition>("positions", {
      select: "position_id,position_name",
      order: "position_id.asc",
    }),
    selectRows<SupabaseStatus>("statuses", {
      select: "status_id,status_name",
      order: "status_id.asc",
    }),
  ]);
  const positionNames = new Map(positions.map(({ position_id, position_name }) => [position_id, position_name]));
  const statusNames = new Map(statuses.map(({ status_id, status_name }) => [status_id, status_name]));

  return {
    accountId: account.account_id,
    accountName: account.account_name,
    positions,
    employees: employees
      .map((employee) => ({
        id: employee.id,
        employeeCode: employee.employee_code || String(employee.id),
        employeeName: employee.employee_name || "Unnamed employee",
        position: employee.position_id ? positionNames.get(employee.position_id) || "N/A" : "N/A",
        positionId: employee.position_id,
        department: employee.Department || "",
        site: employee.site || "",
        hireDate: employee.hire_date || "",
        status: rosterStatus(employee.status_id ? statusNames.get(employee.status_id) : undefined),
      }))
      .sort((left, right) => left.employeeName.localeCompare(right.employeeName)),
  };
}
