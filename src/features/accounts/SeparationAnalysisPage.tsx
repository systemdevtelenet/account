"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, UserMinus, Users } from "lucide-react";
import AccountSidebar from "../../components/AccountSidebar";
import AccountHeader from "./AccountHeader";
import AccountOverviewChart from "./AccountOverviewChart";
import useAccountSidebar from "./useAccountSidebar";
import useDashboardTheme from "../dashboard/useDashboardTheme";
import useLiveWorkforceResource from "../workforce/useLiveWorkforceResource";
import type { AccountWorkforceOverview } from "../../lib/supabase/workforce-data";
import { getCurrentWorkforceAnchor, shiftWorkforceAnchor } from "../../lib/workforce-chart-range";

export default function SeparationAnalysisPage() {
  const [chartAnchor, setChartAnchor] = useState(() => getCurrentWorkforceAnchor("Year"));
  const pathname = usePathname();
  const routeSegments = pathname.split("/").filter(Boolean);
  const accountCode = routeSegments[1] === "accounts" ? routeSegments[2] : routeSegments[1];
  const { data, loading, error } = useLiveWorkforceResource<AccountWorkforceOverview>(
    `/api/accounts/${encodeURIComponent(accountCode ?? "")}/overview?period=Year&anchor=${encodeURIComponent(chartAnchor)}`,
  );
  const darkMode = useDashboardTheme();
  const sidebar = useAccountSidebar();
  const panelClass = darkMode
    ? "border-[var(--color-rule-dark)] bg-[var(--color-panel-dark)] text-[var(--color-ink-dark)]"
    : "border-[var(--color-rule-card)] bg-white text-[var(--color-ink-strong)]";
  const mutedClass = darkMode ? "text-[var(--color-muted-dark-soft)]" : "text-[var(--color-muted-2)]";

  return (
    <main
      data-account-theme={darkMode ? "dark" : "light"}
      data-sidebar-collapsed={sidebar.collapsed}
      data-sidebar-open={sidebar.mobileOpen}
      className={`account-screen min-h-screen ${darkMode ? "bg-[var(--color-night)]" : "bg-[var(--color-paper)]"}`}
    >
      <AccountSidebar
        darkMode={darkMode}
        collapsed={sidebar.collapsed}
        mobileOpen={sidebar.mobileOpen}
        onClose={sidebar.closeMobile}
      />
      <div className="lg:pl-[220px]">
        <section className={`account-hero relative border-b px-4 pt-4 pb-8 sm:px-7 sm:pt-5 sm:pb-9 ${darkMode ? "border-[var(--color-rule-accent)] bg-[var(--color-hero-start)] text-[var(--color-ink-dark)]" : "border-[var(--color-rule-soft-2)] bg-white text-[var(--color-hero-deep)]"}`}>
          <div className="relative z-10">
            <AccountHeader initialDarkMode={darkMode} onMenuClick={sidebar.toggle} menuExpanded={sidebar.expanded} />
            <div className="account-page-heading mt-1 flex min-h-[92px] flex-wrap items-center justify-between gap-3 sm:min-h-[108px]">
              <div>
                <h1 className="text-[29px] font-bold leading-tight sm:text-[34px]">{data?.accountName ?? "Separation analysis"}</h1>
                <p className={`mt-2 max-w-[60ch] text-sm leading-6 ${darkMode ? "text-[var(--color-muted-dark-3)]" : "text-[var(--color-muted-dim-3)]"}`}>
                  Onboarding, offboarding, and workforce changes for this account.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="account-content flex flex-col space-y-5 px-4 py-5 pb-24 sm:px-7 lg:pb-8" aria-busy={loading}>
          {error && !data && <p role="alert" className="rounded-lg border border-red-300 bg-white px-4 py-3 text-sm text-red-700">Workforce records could not be loaded. {error}</p>}

          <div className="account-summary-grid grid gap-3 md:grid-cols-3">
            <SummaryCard label="Currently assigned" value={data ? data.totalEmployees.toLocaleString() : loading ? "—" : "Unavailable"} icon={<Users size={22} />} color="#2F6798" darkMode={darkMode} />
            <SummaryCard label="Recorded account exits this year" value={data ? data.offboardingHistoryAvailable ? data.recordedResignations.toLocaleString() : "Unavailable" : loading ? "—" : "Unavailable"} icon={<UserMinus size={22} />} color="#fa3e65" darkMode={darkMode} />
            <SummaryCard label="Exit records this year" value={data ? data.offboardingHistoryAvailable ? data.movements.reduce((total, movement) => total + movement.count, 0).toLocaleString() : "Unavailable" : loading ? "—" : "Unavailable"} icon={<BarChart3 size={22} />} color="#ffb52c" darkMode={darkMode} />
          </div>

          <section className={`rounded-xl border p-4 shadow-sm sm:p-5 ${panelClass}`}>
            <h2 className="text-sm font-bold">Onboarding and offboarding</h2>
            <p className={`mt-1 text-xs ${mutedClass}`}>Monthly counts from employee start dates and recorded offboarding history.</p>
            {data ? <AccountOverviewChart darkMode={darkMode} grouping="Year" anchorDate={chartAnchor} onNavigate={(amount) => setChartAnchor((anchor) => shiftWorkforceAnchor("Year", anchor, amount))} data={data.chart} /> : <p className={`grid h-[320px] place-items-center text-sm ${mutedClass}`}>{loading ? "Loading workforce movement…" : "No workforce data available."}</p>}
            {data && !data.offboardingHistoryAvailable && <p role="status" className={`mt-2 text-xs ${mutedClass}`}>Offboarding history is not available in the connected database; onboarding counts are still shown.</p>}
          </section>

          <section className={`rounded-xl border p-4 shadow-sm sm:p-5 ${panelClass}`}>
            <h2 className="text-sm font-bold">Recorded movement by type</h2>
            <p className={`mt-1 text-xs ${mutedClass}`}>Events from employee separation history this year. Reasons are not recorded in this data source.</p>
            {data?.movements.length ? (
              <ul className="mt-4 divide-y divide-[var(--color-rule)]">
                {data.movements.map((movement) => (
                  <li key={movement.label} className="flex items-center justify-between py-3 text-sm">
                    <span>{movement.label}</span>
                    <strong className="tabular-nums">{movement.count.toLocaleString()}</strong>
                  </li>
                ))}
              </ul>
          ) : (
              <p className={`mt-4 text-sm ${mutedClass}`}>{loading ? "Loading movement records…" : data && !data.offboardingHistoryAvailable ? "Movement history is not available in the connected database." : "No recorded movement for this year."}</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  darkMode,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  darkMode: boolean;
}) {
  return (
    <article className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm ${darkMode ? "border-[var(--color-rule-dark)] bg-[var(--color-panel-dark)]" : "border-[var(--color-rule-card)] bg-white"}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${color}1b`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${darkMode ? "text-[var(--color-ink-dark-soft)]" : "text-[var(--color-muted-2)]"}`}>{label}</p>
        <p className={`mt-1 truncate text-xl font-bold tabular-nums ${darkMode ? "text-white" : "text-[var(--color-ink-strong)]"}`}>{value}</p>
      </div>
    </article>
  );
}
