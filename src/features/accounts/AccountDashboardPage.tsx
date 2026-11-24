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
      <p className="text-xs text-[#61718b]">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-[#172343] sm:text-[28px]">
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
        darkMode ? "bg-[#101c39] text-[#edf4ff]" : "bg-[#f4f7fb] text-[#172343]"
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
              ? "bg-[radial-gradient(circle_at_72%_-45%,#263a63_0_19%,transparent_40%),linear-gradient(119deg,#101c39_0%,#152442_51%,#1d3156_100%)]"
              : "bg-[radial-gradient(circle_at_72%_-45%,#5F8DB5_0_19%,transparent_40%),linear-gradient(119deg,#2F6798_0%,#3D76A3_51%,#5F8DB5_100%)]"
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

          {error && !data && <p role="alert" className="rounded-lg border border-red-300 bg-white px-4 py-3 text-sm text-red-700">Account workforce data could not be loaded. {error}</p>}

          <div className="mt-4 grid items-start gap-3">
            <section
              id="separation-analysis"
              className="account-panel rounded-xl border border-[#e9eef5] bg-white p-4 shadow-[0_4px_18px_rgba(54,88,125,0.06)] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f0f6] text-[#2F6798]">
                    <BarChart3 size={17} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">Onboarding and offboarding</h2>
                    <p className="text-[10px] text-[#7b89a0]">
                      Counts from employee start dates and recorded offboarding history.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#7b89a0]">
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
                            ? "border-[#d7e4f8] font-bold text-white"
                            : "border-[#667085] font-bold text-[#25324d]"
                          : darkMode
                            ? "border-transparent hover:text-white"
                            : "border-transparent hover:text-[#25324d]"
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              {data ? <AccountOverviewChart darkMode={darkMode} grouping={grouping} data={data.chart} /> : <div className="grid h-[320px] place-items-center text-sm text-slate-500">{loading ? "Loading workforce movement…" : "No workforce data available."}</div>}
              {data && !data.offboardingHistoryAvailable && <p role="status" className="mt-2 text-xs text-amber-700">Offboarding history is not available in the connected database; onboarding counts are still shown.</p>}
            </section>

            <section
              id="onboarding-offboarding"
              className="account-panel rounded-xl border border-[#e9eef5] bg-white p-4 shadow-[0_4px_18px_rgba(54,88,125,0.06)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f0f6] text-[#2F6798]">
                    <UsersRound size={17} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">
                      Current roster
                    </h2>
                    <p className="text-[10px] text-[#7b89a0]">
                      Search the current assigned employees for this account.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(rosterPath)}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#2F6798]"
                >
                  View All <ArrowRight size={14} />
                </button>
              </div>
              <label className="mt-4 flex h-8 items-center gap-2 rounded-lg border border-[#e7edf4] px-2 text-[10px] text-[#9aa6b8]">
                <Search size={14} />
                <input
                  aria-label="Search employee name or ID"
                  placeholder="Search employee name or ID..."
                  value={employeeQuery}
                  onChange={(event) => setEmployeeQuery(event.target.value)}
                  className="w-full bg-transparent outline-none"
                />
              </label>
              <div className="account-table mt-2 overflow-hidden rounded-lg border border-[#e7edf4]">
                <div className="grid grid-cols-[.8fr_1.7fr_1fr_.8fr] bg-[#f8fafc] px-2 py-2 text-[8px] font-bold text-[#687993] sm:px-3">
                  <span>ID</span>
                  <span>NAME</span>
                  <span>ROLE</span>
                  <span>STATUS</span>
                </div>
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="grid grid-cols-[.8fr_1.7fr_1fr_.8fr] items-center border-t border-[#edf1f5] px-2 py-1.5 text-[9px] text-[#4d5c75] sm:px-3"
                  >
                    <span>{employee.employeeCode}</span>
                    <span className="truncate">{employee.employeeName}</span>
                    <span className="truncate text-[#8c98aa]">{employee.position}</span>
                    <span>{employee.status}</span>
                  </div>
                ))}
                {!loading && filteredEmployees.length === 0 && (
                  <p className="border-t border-[#edf1f5] px-3 py-6 text-center text-xs text-slate-500">
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
