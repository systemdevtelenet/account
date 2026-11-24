import "server-only";

import { createSupabaseAdminClient } from "./admin";
import { getAccountRoutes } from "../workforce-routes";
import { normalizeWorkforceAnchor, parseWorkforceAnchor, type WorkforcePeriod } from "../workforce-chart-range";

export type { WorkforcePeriod } from "../workforce-chart-range";

export type WorkforceChartPoint = {
  date: string;
  hires: number;
  offboardings: number;
};

export type WorkforceMovement = { label: string; count: number };

export type WorkforceSummary = {
  totalEmployees: number;
  activeEmployees: number;
  employeesOnLeave: number;
  recordedResignations: number;
  offboardingHistoryAvailable: boolean;
  chart: WorkforceChartPoint[];
  movements: WorkforceMovement[];
};

export type DashboardWorkforceSummary = WorkforceSummary & {
  annualExitCount: number | null;
  quarterlyExits: Array<{ quarter: number; count: number | null; change: number | null; topReason: string | null }>;
  annualSeparationReasons: Array<{ label: string; count: number }>;
};

export type WorkforceAccount = {
  accountId: number;
  accountCode: string;
  fullTitle: string;
  route: string;
  totalEmployees: number;
  activeEmployees: number;
  employeesOnLeave: number;
};

export type WorkforceEmployee = {
  id: number;
  employeeCode: string;
  employeeName: string;
  position: string;
  status: string;
};

export type AccountWorkforceOverview = WorkforceSummary & {
  accountName: string;
  employees: WorkforceEmployee[];
};

type AccountRow = {
  account_id: number;
  account_code: string;
  account_name: string | null;
};

type EmployeeRow = {
  id: number;
  employee_code: string | null;
  employee_name: string | null;
  hire_date: string | null;
  status_id: number | null;
  position_id: number | null;
};

type AssignmentRow = {
  employee_id: number;
  account_id: number | null;
  effective_from: string | null;
  effective_to: string | null;
};

type SeparationRow = {
  employee_id: number | null;
  reason: string | null;
  from_account_id: number | null;
  to_account_id: number | null;
  separation_date: string | null;
  exit_scope: "company" | "account" | "lob" | "none" | "unknown";
};

function isCountedExit(event: SeparationRow, accountId: number | null) {
  if (accountId === null) return event.exit_scope === "company";
  return event.from_account_id === accountId &&
    (event.exit_scope === "company" || event.exit_scope === "account" || event.exit_scope === "lob");
}

function reasonLabel(reason: string | null) {
  return (reason?.trim() || "Unspecified").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type SelectPage<T> = (
  from: number,
  to: number,
) => PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null; count?: number | null }>;

const PAGE_SIZE = 1_000;

function normalize(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized === "FLEX" ? "FLEXAR" : normalized;
}

function periodBins(period: WorkforcePeriod, now: Date, requestedAnchor?: string | null) {
  const today = now.toISOString().slice(0, 10);
  const anchorValue = requestedAnchor && parseWorkforceAnchor(requestedAnchor)
    ? normalizeWorkforceAnchor(period, requestedAnchor)
    : normalizeWorkforceAnchor(period, today);
  const anchor = parseWorkforceAnchor(anchorValue)!;
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  let start: Date;
  let count: number;
  let unit: "day" | "month";

  if (period === "Week") {
    start = anchor;
    const currentWeekStart = parseWorkforceAnchor(normalizeWorkforceAnchor("Week", today))!;
    count = start > currentWeekStart ? 0 : start.getTime() === currentWeekStart.getTime()
      ? Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1
      : 7;
    unit = "day";
  } else if (period === "Month") {
    start = anchor;
    count = year > currentYear || (year === currentYear && month > currentMonth)
      ? 0
      : year === currentYear && month === currentMonth
        ? now.getUTCDate()
        : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    unit = "day";
  } else if (period === "Quarter") {
    start = anchor;
    const quarterEndMonth = month + 2;
    count = year > currentYear || (year === currentYear && month > Math.floor(currentMonth / 3) * 3)
      ? 0
      : year === currentYear && quarterEndMonth >= currentMonth
        ? currentMonth - month + 1
        : 3;
    unit = "month";
  } else {
    start = anchor;
    count = year > currentYear ? 0 : year === currentYear ? currentMonth + 1 : 12;
    unit = "month";
  }

  const bins = Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    if (unit === "day") date.setUTCDate(date.getUTCDate() + index);
    if (unit === "month") date.setUTCMonth(date.getUTCMonth() + index);
    return date;
  });
  const end = bins.length ? new Date(bins[bins.length - 1]) : new Date(start);
  if (bins.length && unit === "day") end.setUTCDate(end.getUTCDate() + 1);
  if (bins.length && unit === "month") end.setUTCMonth(end.getUTCMonth() + 1);

  return { bins, start, end, unit };
}

function dateBinIndex(dateString: string | null, start: Date, end: Date, unit: "day" | "month", through: Date) {
  if (!dateString) return -1;
  const date = new Date(`${dateString.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date < start || date >= end || date > through) return -1;

  if (unit === "day") return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return (date.getUTCFullYear() - start.getUTCFullYear()) * 12 + date.getUTCMonth() - start.getUTCMonth();
}

function formatBinLabel(date: Date, period: WorkforcePeriod) {
  if (period === "Week") return date.toLocaleDateString("en", { weekday: "short", timeZone: "UTC" });
  if (period === "Month") return String(date.getUTCDate());
  return date.toLocaleDateString("en", { month: "short", timeZone: "UTC" });
}

function getReportingDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
}

function isActiveStatus(status: string | undefined) {
  return status === "Active" || status === "Lateral";
}

function isOnLeaveStatus(status: string | undefined) {
  return status === "On Leave";
}

function statusLabel(status: string | undefined) {
  return status || "Unknown";
}

async function readAllRows<T>(selectPage: SelectPage<T>) {
  const rows: T[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error, count } = await selectPage(offset, offset + PAGE_SIZE - 1);
    if (error) throw Object.assign(new Error(`Supabase could not load workforce rows: ${error.message}`), { code: error.code });
    const page = data ?? [];
    rows.push(...page);
    if (count != null ? offset + page.length >= count : page.length < PAGE_SIZE) return rows;
  }
}

function isCurrentAssignment(assignment: AssignmentRow, now: Date) {
  if (assignment.effective_to !== null) return false;
  if (!assignment.effective_from) return true;

  const effectiveFrom = Date.parse(assignment.effective_from);
  return !Number.isNaN(effectiveFrom) && effectiveFrom <= now.getTime();
}

function getSummary(
  employees: EmployeeRow[],
  assignments: AssignmentRow[],
  separations: SeparationRow[],
  statusNames: Map<number, string>,
  accountId: number | null,
  period: WorkforcePeriod,
  now: Date,
  historicalAssignments = assignments,
  chartAnchor?: string | null,
  offboardingHistoryAvailable = true,
): WorkforceSummary {
  const accountAssignments = accountId === null
    ? assignments
    : assignments.filter((assignment) => assignment.account_id === accountId);
  const assignedEmployeeIds = new Set(accountAssignments.map(({ employee_id }) => employee_id));
  const assignedEmployees = employees.filter(({ id }) => assignedEmployeeIds.has(id));
  const statuses = assignedEmployees.map(({ status_id }) => status_id ? statusNames.get(status_id) : undefined);
  const accountSeparations = separations.filter((event) => isCountedExit(event, accountId));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
  const recordedResignations = accountSeparations.filter((event) => {
    const eventDate = event.separation_date ? new Date(`${event.separation_date.slice(0, 10)}T00:00:00Z`) : null;
    return eventDate !== null && eventDate >= yearStart && eventDate < yearEnd && eventDate <= now;
  }).length;
  const { bins, start, end, unit } = periodBins(period, now, chartAnchor);
  const accountHireAssignments = accountId === null
    ? historicalAssignments
    : historicalAssignments.filter((assignment) => assignment.account_id === accountId);
  const hireCounts = bins.map(() => 0);
  const offboardingCounts = bins.map(() => 0);

  // A hire is attributed to an account only when its assignment covered the hire date.
  const hireEvents = new Set<string>();
  if (accountId === null) {
    // The main dashboard represents the complete employee database, independent of assignments.
    for (const employee of employees) {
      if (!employee.hire_date) continue;
      const index = dateBinIndex(employee.hire_date, start, end, unit, now);
      if (index >= 0) hireEvents.add(`${employee.id}:${index}`);
    }
  } else {
    for (const assignment of accountHireAssignments) {
      const employee = employees.find(({ id }) => id === assignment.employee_id);
      if (!employee?.hire_date) continue;
      const hiredAt = employee.hire_date.slice(0, 10);
      if (assignment.effective_from && hiredAt < assignment.effective_from.slice(0, 10)) continue;
      if (assignment.effective_to && hiredAt > assignment.effective_to.slice(0, 10)) continue;
      const index = dateBinIndex(hiredAt, start, end, unit, now);
      if (index >= 0) hireEvents.add(`${employee.id}:${index}`);
    }
  }
  for (const hire of hireEvents) hireCounts[Number(hire.slice(hire.lastIndexOf(":") + 1))] += 1;

  for (const event of accountSeparations) {
    const index = dateBinIndex(event.separation_date, start, end, unit, now);
    if (index >= 0) offboardingCounts[index] += 1;
  }

  const movementCounts = new Map<string, number>();
  for (const event of accountSeparations) {
    if (!event.separation_date || event.separation_date.slice(0, 4) !== String(now.getUTCFullYear()) || event.separation_date.slice(0, 10) > now.toISOString().slice(0, 10)) continue;
    const label = reasonLabel(event.reason);
    movementCounts.set(label, (movementCounts.get(label) ?? 0) + 1);
  }

  return {
    totalEmployees: assignedEmployees.length,
    activeEmployees: statuses.filter(isActiveStatus).length,
    employeesOnLeave: statuses.filter(isOnLeaveStatus).length,
    recordedResignations,
    offboardingHistoryAvailable,
    chart: bins.map((date, index) => ({
      date: formatBinLabel(date, period),
      hires: hireCounts[index],
      offboardings: offboardingCounts[index],
    })),
    movements: [...movementCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count),
  };
}

export function parseWorkforcePeriod(value: string | null): WorkforcePeriod {
  return value === "Week" || value === "Month" || value === "Quarter" || value === "Year" ? value : "Year";
}

async function readWorkforceRows() {
  const supabase = createSupabaseAdminClient();
  const [accounts, employees, assignments, separationHistory, statuses, positions] = await Promise.all([
    readAllRows<AccountRow>((from, to) => supabase
      .from("accounts")
      .select("account_id,account_code,account_name", { count: "exact" })
      .eq("is_active", true)
      .order("account_id")
      .range(from, to)),
    readAllRows<EmployeeRow>((from, to) => supabase
      .from("employees")
      .select("id,employee_code,employee_name,hire_date,status_id,position_id", { count: "exact" })
      .order("id")
      .range(from, to)),
    readAllRows<AssignmentRow>((from, to) => supabase
      .from("employee_assignments")
      .select("employee_id,account_id,effective_from,effective_to", { count: "exact" })
      .order("assignment_id")
      .range(from, to)),
    readAllRows<SeparationRow>((from, to) => supabase
      .from("operation_system_attrition_events")
      .select("id,employee_id,reason,separation_date,from_account_id,to_account_id,exit_scope", { count: "exact" })
      .order("id")
      .range(from, to)),
    readAllRows<{ status_id: number; status_name: string }>((from, to) => supabase
      .from("statuses")
      .select("status_id,status_name", { count: "exact" })
      .order("status_id")
      .range(from, to)),
    readAllRows<{ position_id: number; position_name: string }>((from, to) => supabase
      .from("positions")
      .select("position_id,position_name", { count: "exact" })
      .order("position_id")
      .range(from, to)),
  ]);

  return {
    accounts,
    employees,
    assignments,
    separations: separationHistory,
    offboardingHistoryAvailable: separationHistory.length > 0,
    statusNames: new Map(statuses.map((row) => [row.status_id, row.status_name])),
    positionNames: new Map(positions.map((row) => [row.position_id, row.position_name])),
  };
}

export async function getDashboardWorkforce(period: WorkforcePeriod, chartAnchor?: string | null) {
  const rows = await readWorkforceRows();
  const now = new Date();
  const reportingDate = getReportingDate();
  const activeAccountIds = new Set(rows.accounts.map(({ account_id }) => account_id));
  const activeAccountAssignments = rows.assignments.filter((assignment) => activeAccountIds.has(assignment.account_id ?? -1));
  const currentAssignments = activeAccountAssignments.filter((assignment) => isCurrentAssignment(assignment, now));
  const summary = getSummary(rows.employees, currentAssignments, rows.separations, rows.statusNames, null, period, reportingDate, activeAccountAssignments, chartAnchor, rows.offboardingHistoryAvailable);
  const accounts: WorkforceAccount[] = rows.accounts.map((account) => {
    const accountSummary = getSummary(rows.employees, currentAssignments, rows.separations, rows.statusNames, account.account_id, period, reportingDate, undefined, undefined, rows.offboardingHistoryAvailable);
    return {
      accountId: account.account_id,
      accountCode: account.account_code,
      fullTitle: account.account_name || account.account_code,
      route: getAccountRoutes(account.account_code).overview,
      totalEmployees: accountSummary.totalEmployees,
      activeEmployees: accountSummary.activeEmployees,
      employeesOnLeave: accountSummary.employeesOnLeave,
    };
  }).filter((account) => account.totalEmployees > 0);

  const year = reportingDate.getUTCFullYear();
  const yearSeparations = rows.separations.filter((event) =>
    isCountedExit(event, null) && event.separation_date?.slice(0, 4) === String(year) && event.separation_date.slice(0, 10) <= reportingDate.toISOString().slice(0, 10),
  );
  const annualSeparationReasons = [...yearSeparations.reduce((counts, event) => {
    const label = reasonLabel(event.reason);
    counts.set(label, (counts.get(label) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);
  const quarterCounts = Array.from({ length: 4 }, (_, index) => {
    const quarter = index + 1;
    const start = new Date(Date.UTC(year, index * 3, 1));
    const end = new Date(Date.UTC(year, (index + 1) * 3, 1));
    let count = 0;
    const reasons = new Map<string, number>();
    for (const event of yearSeparations) {
      if (!event.separation_date) continue;
      const date = new Date(`${event.separation_date.slice(0, 10)}T00:00:00Z`);
      if (date < start || date >= end || date > reportingDate) continue;
      count += 1;
      const label = reasonLabel(event.reason);
      reasons.set(label, (reasons.get(label) ?? 0) + 1);
    }
    return { quarter, count: rows.offboardingHistoryAvailable ? count : null, topReason: [...reasons].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null };
  });
  const quarterlyExits = quarterCounts.map((item, index) => ({
    ...item,
    change: index > 0 && item.count !== null && quarterCounts[index - 1].count !== null
      ? item.count - quarterCounts[index - 1].count!
      : null,
  }));

  return {
    ...summary,
    annualExitCount: rows.offboardingHistoryAvailable ? yearSeparations.length : null,
    quarterlyExits,
    annualSeparationReasons,
    accounts,
  };
}

export async function getAccountWorkforce(accountCode: string, period: WorkforcePeriod, chartAnchor?: string | null): Promise<AccountWorkforceOverview | null> {
  const rows = await readWorkforceRows();
  const normalizedCode = normalize(accountCode);
  const account = rows.accounts.find((candidate) => normalize(candidate.account_code) === normalizedCode);
  if (!account) return null;

  const assignments = rows.assignments.filter((assignment) => assignment.account_id === account.account_id);
  const now = new Date();
  const reportingDate = getReportingDate();
  const currentAssignments = assignments.filter((assignment) => isCurrentAssignment(assignment, now));
  const summary = getSummary(rows.employees, currentAssignments, rows.separations, rows.statusNames, account.account_id, period, reportingDate, assignments, chartAnchor, rows.offboardingHistoryAvailable);
  const currentEmployeeIds = new Set(currentAssignments.map(({ employee_id }) => employee_id));
  const employees = rows.employees
    .filter((employee) => currentEmployeeIds.has(employee.id))
    .map((employee) => {
      const employeeStatus = employee.status_id ? rows.statusNames.get(employee.status_id) : undefined;
      return {
        id: employee.id,
        employeeCode: employee.employee_code || String(employee.id),
        employeeName: employee.employee_name || "Unnamed employee",
        position: employee.position_id ? rows.positionNames.get(employee.position_id) || "N/A" : "N/A",
        status: statusLabel(employeeStatus),
      };
    })
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));

  return { ...summary, accountName: account.account_name || account.account_code, employees };
}
