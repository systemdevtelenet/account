"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardWorkforceSummary } from "../../lib/supabase/workforce-data";

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)", "var(--color-chart-6)"];
const panel = "dashboard-analytics-panel min-w-0 rounded-xl border p-4 sm:p-5";

export default function AttritionSummary({ data, loading }: { data: DashboardWorkforceSummary | null; loading: boolean }) {
  const reasons = data?.annualSeparationReasons ?? [];
  const total = reasons.reduce((sum, reason) => sum + reason.count, 0);
  const ranked = reasons.map((reason, index) => ({
    ...reason,
    share: total ? reason.count / total * 100 : 0,
    color: COLORS[index % COLORS.length],
  }));
  const quarterNames = ["Q1 (Jan - Mar)", "Q2 (Apr - Jun)", "Q3 (Jul - Sep)", "Q4 (Oct - Dec)"];

  return (
    <div className="mt-4 grid gap-4">
      <section className={panel} aria-labelledby="quarterly-attrition-heading">
        <div className="mb-4">
          <h3 id="quarterly-attrition-heading" className="text-sm font-bold">Quarterly Exits &amp; Top Reason Summary</h3>
          <p className="dashboard-analytics-muted mt-1 text-xs">Recorded company exits and top separation reasons by quarter. The current quarter is shown to date.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.quarterlyExits ?? [1, 2, 3, 4].map((quarter) => ({ quarter, count: null, change: null, topReason: null }))).map((item) => (
            <article key={item.quarter} className="dashboard-quarter-card rounded-lg border p-4">
              <p className="dashboard-analytics-muted text-[11px]">{quarterNames[item.quarter - 1]}</p>
              <p className="mt-3 text-[28px] font-bold leading-none tabular-nums">{data ? item.count?.toLocaleString() ?? "Unavailable" : loading ? "—" : "Unavailable"}</p>
              <p className={`mt-1 text-[11px] ${item.change === null ? "dashboard-analytics-muted" : item.change > 0 ? "text-red-600" : "text-emerald-700"}`}>
                {item.change === null ? "— vs previous quarter" : `${item.change > 0 ? "↑" : item.change < 0 ? "↓" : "→"} ${Math.abs(item.change).toLocaleString()} exits vs previous quarter`}
              </p>
              <p className="dashboard-analytics-muted mt-3 text-[11px]">Top driver: <strong className="text-[var(--color-accent)]">{item.topReason ?? "No recorded exits"}</strong></p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <section className={panel} aria-labelledby="separation-share-heading">
          <h3 id="separation-share-heading" className="text-sm font-bold">Separation Reasons This Year</h3>
          <p className="dashboard-analytics-muted mt-1 text-xs">Distribution of separation reasons for the selected year.</p>
          {ranked.length ? (
            <div className="mt-4 grid min-h-[250px] items-center gap-2 sm:grid-cols-[minmax(180px,1fr)_minmax(0,1.25fr)]">
              <div className="relative mx-auto h-[230px] w-full max-w-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ranked} dataKey="count" nameKey="label" innerRadius="52%" outerRadius="83%" stroke="none">
                      {ranked.map((reason) => <Cell key={reason.label} fill={reason.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()} (${total ? (Number(value) / total * 100).toFixed(2) : "0.00"}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-xl tabular-nums">{total.toLocaleString()}</strong>
                  <span className="dashboard-analytics-muted mt-1 text-[10px]">Total exits</span>
                </div>
              </div>
              <ul className="space-y-2">
                {ranked.map((reason) => (
                  <li key={reason.label} className="grid grid-cols-[minmax(0,1fr)_36px_48px] items-center gap-2 text-[11px]">
                    <span className="flex min-w-0 items-center gap-2"><i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: reason.color }} /><span className="truncate dashboard-analytics-muted">{reason.label}</span></span>
                    <strong className="text-right tabular-nums">{reason.count.toLocaleString()}</strong>
                    <strong className="text-right text-[var(--color-accent)] tabular-nums">{reason.share.toFixed(2)}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="dashboard-analytics-muted grid min-h-[250px] place-items-center text-sm">{loading ? "Loading separation history…" : "No separation reasons recorded this year."}</p>}
        </section>

        <section className={panel} aria-labelledby="ranked-separation-heading">
          <h3 id="ranked-separation-heading" className="text-sm font-bold">Ranked Separation Categories</h3>
          <p className="dashboard-analytics-muted mt-1 text-xs">Top reasons for employee separations this year.</p>
          {ranked.length ? <ol className="mt-4 space-y-3">
            {ranked.map((reason, index) => (
              <li key={reason.label} className="grid grid-cols-[30px_minmax(0,1fr)_36px] items-center gap-2 text-[11px]">
                <span className="grid h-6 place-items-center rounded-md bg-[var(--color-paper-2)] font-semibold" style={{ color: reason.color }}>#{index + 1}</span>
                <div className="min-w-0">
                  <div className="flex justify-between gap-2"><span className="truncate">{reason.label}</span><span className="dashboard-analytics-muted shrink-0 tabular-nums">{reason.share.toFixed(2)}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-2)]"><div className="h-full rounded-full" style={{ width: `${reason.share}%`, backgroundColor: reason.color }} /></div>
                </div>
                <strong className="text-right tabular-nums">{reason.count.toLocaleString()}</strong>
              </li>
            ))}
          </ol> : <p className="dashboard-analytics-muted grid min-h-[250px] place-items-center text-sm">{loading ? "Loading separation history…" : "No separation categories recorded this year."}</p>}
        </section>
      </div>
    </div>
  );
}
