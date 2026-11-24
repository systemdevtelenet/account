"use client";

import { useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WorkforcePeriod } from "../../lib/workforce-chart-range";
import { formatWorkforceAnchorLabel } from "../../lib/workforce-chart-range";

type AccountOverviewChartProps = {
  darkMode: boolean;
  grouping: WorkforcePeriod;
  data: ChartPoint[];
  // Keep navigation optional for chart instances that display a fixed range.
  anchorDate?: string;
  onNavigate?: (amount: number) => void;
};

type ChartPoint = {
  date: string;
  hires: number;
  offboardings: number;
};

// Keep chart colors and the accessibility preference in one place so the
// visual series and animation behavior stay consistent across the chart.
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const HIRE_COLOR = "#23864b";
const OFFBOARDING_COLOR = "#c34242";

// Expose the media query as a React external store so preference changes made
// while the dashboard is open immediately update the chart animation state.
function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Recharts-based area chart for the account overview panel.
 * The chart stays independent from the dashboard layout.
 */
export default function AccountOverviewChart({
  darkMode,
  grouping,
  data,
  anchorDate,
  onNavigate,
}: AccountOverviewChartProps) {
  const textColor = "var(--color-muted)";
  const gridColor = "var(--color-rule)";
  // React to preference changes so an open chart can stop animating immediately.
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  // Recharts needs at least one point to calculate its layout, so use a
  // neutral point instead of rendering an empty chart when no records exist.
  const chartData = data.length > 0
    ? data
    : [{ date: "", hires: 0, offboardings: 0 }];

  return (
    <div
      aria-label={`${grouping} onboarding and offboarding trend`}
      data-chart-theme={darkMode ? "dark" : "light"}
      className="account-chart mt-4 flex min-w-0 h-[320px] w-full max-w-none flex-col rounded-lg border p-2 lg:h-[380px] 2xl:h-[430px]"
    >
      {anchorDate && onNavigate && (
        /* Controls update the parent anchor, which reloads data for that range. */
        <div className="mb-2 flex items-center justify-between px-1">
          <button
            type="button"
            aria-label={`Previous ${grouping.toLowerCase()}`}
            onClick={() => onNavigate(-1)}
            className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-rule)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="text-xs font-semibold text-[var(--color-ink)]">
            {formatWorkforceAnchorLabel(grouping, anchorDate)}
          </span>
          <button
            type="button"
            aria-label={`Next ${grouping.toLowerCase()}`}
            onClick={() => onNavigate(1)}
            className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-rule)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="min-h-0 w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                {/* The fills distinguish the two event types without obscuring their lines. */}
                <linearGradient id="overview-hire-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={HIRE_COLOR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={HIRE_COLOR} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="overview-offboarding-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={OFFBOARDING_COLOR} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={OFFBOARDING_COLOR} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              {/* Use the dashboard theme tokens so chart chrome follows light/dark mode. */}
              <CartesianGrid stroke={gridColor} strokeDasharray="3 5" vertical />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: textColor, fontSize: 10 }}
                tickMargin={8}
              />
              {/* Leave a small headroom above the last cumulative event. */}
              <YAxis
                domain={[0, "dataMax + 2"]}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: textColor, fontSize: 10 }}
                width={30}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--color-muted)",
                  strokeDasharray: "3 3",
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-rule)",
                  backgroundColor: "var(--color-panel)",
                  color: "var(--color-ink)",
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="top"
                align="center"
                height={30}
                wrapperStyle={{ color: textColor, fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="hires"
                name="Onboarding"
                stroke={HIRE_COLOR}
                strokeWidth={2.5}
                fill="url(#overview-hire-fill)"
                activeDot={{ r: 4 }}
                isAnimationActive={!reducedMotion}
                animationDuration={360}
              />
              <Area
                type="monotone"
                dataKey="offboardings"
                name="Offboarding"
                stroke={OFFBOARDING_COLOR}
                strokeWidth={2.5}
                fill="url(#overview-offboarding-fill)"
                activeDot={{ r: 4 }}
                isAnimationActive={!reducedMotion}
                animationDuration={360}
              />
            </AreaChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
}
