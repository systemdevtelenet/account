"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Search,
  UsersRound,
} from "lucide-react";
import AccountSidebar from "../../components/AccountSidebar";
import AccountHeader from "./AccountHeader";
import AccountOverviewChart from "./AccountOverviewChart";
import useAccountSidebar from "./useAccountSidebar";
import useDashboardTheme from "../dashboard/useDashboardTheme";
import useLiveWorkforceResource from "../workforce/useLiveWorkforceResource";
import type { AccountWorkforceOverview } from "../../lib/supabase/workforce-data";
import { getAccountRoutes } from "../../lib/workforce-routes";
import { getCurrentWorkforceAnchor, type WorkforcePeriod } from "../../lib/workforce-chart-range";

type AccountDashboardPageProps = {
  accountCode: string;
};

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="account-summary-item min-w-0 py-2 sm:py-3">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-[var(--color-ink)] sm:text-[28px]">
        {value}
      </p>
    </article>
  );
}

export default function AccountDashboardPage({
  accountCode,
}: AccountDashboardPageProps) {
  const router = useRouter();
  const [grouping, setGrouping] = useState<WorkforcePeriod>("Year");
  const [chartAnchor, setChartAnchor] = useState(() => getCurrentWorkforceAnchor("Year"));
  const [employeeQuery, setEmployeeQuery] = useState("");
  const { data, loading, error } = useLiveWorkforceResource<AccountWorkforceOverview>(
    `/api/accounts/${encodeURIComponent(accountCode)}/overview?period=${grouping}&anchor=${encodeURIComponent(chartAnchor)}`,
  );
  const darkMode = useDashboardTheme();
  const sidebar = useAccountSidebar();
  const filteredEmployees = (data?.employees ?? []).filter((employee) =>
    `${employee.employeeCode} ${employee.employeeName} ${employee.position} ${employee.status}`
      .toLowerCase()
      .includes(employeeQuery.toLowerCase()),
  ).slice(0, 10);
  const rosterPath = getAccountRoutes(accountCode).roster;

  return (
    <main
      id="settings"
      data-account-theme={darkMode ? "dark" : "light"}
      data-sidebar-collapsed={sidebar.collapsed}
      data-sidebar-open={sidebar.mobileOpen}
      className={`account-page account-screen min-h-screen ${
        darkMode ? "bg-[var(--color-night)] text-[var(--color-ink-dark)]" : "bg-[var(--color-status-well-soft)] text-[var(--color-ink)]"
      }`}
    >
      <AccountSidebar
        darkMode={darkMode}
        collapsed={sidebar.collapsed}
        mobileOpen={sidebar.mobileOpen}
        onClose={sidebar.closeMobile}
      />

      <div className="lg:pl-[220px]">
        <section
          id="core-staffing"
          className={`account-hero relative px-4 pt-4 pb-8 text-white sm:px-7 lg:px-7 ${
            darkMode
              ? "bg-[radial-gradient(circle_at_72%_-45%,var(--color-hero-radial-dark)_0_19%,transparent_40%),linear-gradient(119deg,var(--color-night)_0%,var(--color-hero-mid-dark)_51%,var(--color-hero-end-dark)_100%)]"
              : "bg-[radial-gradient(circle_at_72%_-45%,var(--color-blue-muted)_0_19%,transparent_40%),linear-gradient(119deg,var(--color-accent)_0%,var(--color-hero-mid-light)_51%,var(--color-blue-muted)_100%)]"
          }`}
        >
          <div className="relative w-full">
            <AccountHeader
              initialDarkMode={darkMode}
              onMenuClick={sidebar.toggle}
              menuExpanded={sidebar.expanded}
            />
            <div className="account-page-heading mt-4 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[27px] font-semibold leading-tight sm:text-[32px]">
                  {data?.accountName ?? (loading ? "Loading account…" : "Account overview")}
                </h1>
                <p className="mt-2 max-w-[60ch] text-sm leading-6 text-white/85">
                Current roster and recorded employee movement for this account.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="account-content relative z-10 w-full px-4 pb-24 sm:px-7 lg:px-7 lg:pb-8">
          <section aria-labelledby="workforce-snapshot-heading">
            <h2 id="workforce-snapshot-heading" className="mb-3 text-base font-semibold">Workforce snapshot</h2>
            <div className="account-summary-grid grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard label="Currently assigned" value={data ? String(data.totalEmployees) : loading ? "—" : "Unavailable"} />
              <KpiCard label="Active employees" value={data ? String(data.activeEmployees) : loading ? "—" : "Unavailable"} />
              <KpiCard label="Employees on leave" value={data ? String(data.employeesOnLeave) : loading ? "—" : "Unavailable"} />
              <KpiCard label="Recorded account exits this year" value={data ? data.offboardingHistoryAvailable ? String(data.recordedResignations) : "Unavailable" : loading ? "—" : "Unavailable"} />
            </div>
          </section>

          {error && !data && <p role="alert" className="rounded-lg border border-[var(--color-danger-border-soft)] bg-white px-4 py-3 text-sm text-[var(--color-danger-text)]">Account workforce data could not be loaded. {error}</p>}

          <div className="mt-4 grid items-start gap-3">
            <section
              id="separation-analysis"
              className="account-panel rounded-xl border border-[var(--color-status-well-card)] bg-white p-4 shadow-[0_4px_18px_var(--color-panel-shadow-soft)] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-status-well)] text-[var(--color-accent)]">
                    <BarChart3 size={17} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">Onboarding and offboarding</h2>
                    <p className="text-[10px] text-[var(--color-muted-soft)]">
                      Counts from employee start dates and recorded offboarding history.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--color-muted-soft)]">
                  {(["Week", "Month", "Quarter", "Year"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => {
                        setGrouping(period);
                        setChartAnchor(getCurrentWorkforceAnchor(period));
                      }}
                      className={`border-b-2 pb-2 transition-colors ${
                        grouping === period
                          ? darkMode
                            ? "border-[var(--color-rule-active)] font-bold text-white"
                            : "border-[var(--color-muted-dim-5)] font-bold text-[var(--color-rule-soft-dark)]"
                          : darkMode
                            ? "border-transparent hover:text-white"
                            : "border-transparent hover:text-[var(--color-rule-soft-dark)]"
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              {data ? <AccountOverviewChart darkMode={darkMode} grouping={grouping} data={data.chart} /> : <div className="grid h-[320px] place-items-center text-sm text-[var(--color-muted)]">{loading ? "Loading workforce movement…" : "No workforce data available."}</div>}
              {data && !data.offboardingHistoryAvailable && <p role="status" className="mt-2 text-xs text-[var(--color-warning-ink)]">Offboarding history is not available in the connected database; onboarding counts are still shown.</p>}
            </section>

            <section
              id="onboarding-offboarding"
              className="account-panel rounded-xl border border-[var(--color-status-well-card)] bg-white p-4 shadow-[0_4px_18px_var(--color-panel-shadow-soft)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-status-well)] text-[var(--color-accent)]">
                    <UsersRound size={17} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">
                      Current roster
                    </h2>
                    <p className="text-[10px] text-[var(--color-muted-soft)]">
                      Search the current assigned employees for this account.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(rosterPath)}
                  className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-accent)]"
                >
                  View All <ArrowRight size={14} />
                </button>
              </div>
              <label className="mt-4 flex h-8 items-center gap-2 rounded-lg border border-[var(--color-rule-soft-3)] px-2 text-[10px] text-[var(--color-muted-dim-7)]">
                <Search size={14} />
                <input
                  aria-label="Search employee name or ID"
                  placeholder="Search employee name or ID..."
                  value={employeeQuery}
                  onChange={(event) => setEmployeeQuery(event.target.value)}
                  className="w-full bg-transparent outline-none"
                />
              </label>
              <div className="account-table mt-2 overflow-hidden rounded-lg border border-[var(--color-rule-soft-3)]">
                <div className="grid grid-cols-[.8fr_1.7fr_1fr_.8fr] bg-[var(--color-table-head-cool)] px-2 py-2 text-[8px] font-bold text-[var(--color-muted-2)] sm:px-3">
                  <span>ID</span>
                  <span>NAME</span>
                  <span>ROLE</span>
                  <span>STATUS</span>
                </div>
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="grid grid-cols-[.8fr_1.7fr_1fr_.8fr] items-center border-t border-[var(--color-rule-row)] px-2 py-1.5 text-[9px] text-[var(--color-muted-dim-2)] sm:px-3"
                  >
                    <span>{employee.employeeCode}</span>
                    <span className="truncate">{employee.employeeName}</span>
                    <span className="truncate text-[var(--color-muted-dim-6)]">{employee.position}</span>
                    <span>{employee.status}</span>
                  </div>
                ))}
                {!loading && filteredEmployees.length === 0 && (
                  <p className="border-t border-[var(--color-rule-row)] px-3 py-6 text-center text-xs text-[var(--color-muted)]">
                    {data?.employees.length ? "No employees match this search." : "No current assignments for this account."}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

    </main>
  );
}
