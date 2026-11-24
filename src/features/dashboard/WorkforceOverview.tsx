"use client";

import { CalendarDays, UserRoundX, Users, UserRoundCheck } from "lucide-react";
import AccountOverviewChart from "../accounts/AccountOverviewChart";
import type { DashboardWorkforceSummary } from "../../lib/supabase/workforce-data";
import type { WorkforcePeriod } from "../../lib/workforce-chart-range";
import AttritionSummary from "./AttritionSummary";

export type OverviewPeriod = WorkforcePeriod;

type Props = {
  darkMode: boolean;
  period: OverviewPeriod;
  onPeriodChange: (period: OverviewPeriod) => void;
  anchorDate: string;
  onNavigate: (amount: number) => void;
  data: DashboardWorkforceSummary | null;
  loading: boolean;
  error: string;
};

const metrics = [
  { label: "Currently assigned", field: "totalEmployees" as const, icon: Users },
  { label: "Active employees", field: "activeEmployees" as const, icon: UserRoundCheck },
  { label: "Employees on leave", field: "employeesOnLeave" as const, icon: CalendarDays },
  { label: "Recorded exits this year", field: "annualExitCount" as const, icon: UserRoundX },
];

const panel = "dashboard-analytics-panel min-w-0 rounded-xl border p-4 sm:p-5";

export default function WorkforceOverview({
  darkMode,
  period,
  onPeriodChange,
  anchorDate,
  onNavigate,
  data,
  loading,
  error,
}: Props) {
  return (
    <div className="w-full" aria-busy={loading}>
      <header className="mb-5">
        <h2 id="workforce-analytics-heading" className="text-xl font-bold sm:text-[23px]">
          Workforce analytics
        </h2>
        <p className="dashboard-analytics-muted mt-1 text-[13px]">
          Current roster and recorded employee movement
        </p>
      </header>

      {error && !data && (
        <p role="alert" className="mb-4 rounded-lg border border-red-300 px-4 py-3 text-sm text-red-700">
          Workforce data could not be loaded. {error}
        </p>
      )}

      <div className="dashboard-metrics mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
        {metrics.map((metric) => {
          const value = data?.[metric.field];
          const formattedValue = value == null
            ? "Unavailable"
            : value.toLocaleString();

          return (
            <article
              className="dashboard-metric dashboard-overview-metric relative flex min-h-[124px] flex-col justify-center overflow-hidden border px-4 py-3 sm:px-5"
              key={metric.label}
            >
              <metric.icon
                aria-hidden="true"
                className="dashboard-metric-mark pointer-events-none absolute right-[-8px] top-1/2 -translate-y-1/2"
                size={72}
                strokeWidth={1.5}
              />
              <div className="relative z-10 max-w-[calc(100%-2.5rem)]">
                <p className="dashboard-metric-muted text-xs font-medium leading-4 sm:text-sm">
                  {metric.label}
                </p>
                <p className="mt-3 text-[30px] font-semibold leading-none tabular-nums sm:text-[36px]">
                  {data ? formattedValue : loading ? "—" : "Unavailable"}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <article className={panel}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Onboarding and offboarding</h3>
            <p className="dashboard-analytics-muted mt-1 text-xs">
              Counts from employee start dates and recorded offboarding history.
            </p>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Trend time range">
            {(["Week", "Month", "Quarter", "Year"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPeriodChange(item)}
                aria-pressed={period === item}
                className={`min-h-10 border-b-2 px-2.5 py-2 text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${period === item ? "border-[var(--color-focus)] font-bold text-[var(--color-ink)]" : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {data && !data.offboardingHistoryAvailable && (
          <p role="status" className="mb-2 text-xs text-amber-700">
            Offboarding history is not available in the connected database; onboarding counts are still shown.
          </p>
        )}
        {data ? (
          <AccountOverviewChart darkMode={darkMode} grouping={period} anchorDate={anchorDate} onNavigate={onNavigate} data={data.chart} />
        ) : (
          <div className="grid min-h-[320px] place-items-center text-sm text-[var(--color-muted)]">
            {loading ? "Loading workforce movement…" : "No workforce data available."}
          </div>
        )}
      </article>

      <AttritionSummary data={data} loading={loading} />
    </div>
  );
}
