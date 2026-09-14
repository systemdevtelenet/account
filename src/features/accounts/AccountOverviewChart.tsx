"use client";

import { useMemo } from "react";
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

type AccountOverviewChartProps = {
  darkMode: boolean;
  grouping: string;
};

type ChartPoint = {
  date: string;
  staffing: number;
  attrition: number;
};

const chartData: ChartPoint[] = [
  { date: "Jan", staffing: 34, attrition: 27 },
  { date: "Feb", staffing: 42, attrition: 31 },
  { date: "Mar", staffing: 38, attrition: 35 },
  { date: "Apr", staffing: 58, attrition: 44 },
  { date: "May", staffing: 47, attrition: 39 },
  { date: "Jun", staffing: 55, attrition: 46 },
  { date: "Jul", staffing: 71, attrition: 52 },
  { date: "Aug", staffing: 62, attrition: 58 },
  { date: "Sep", staffing: 87, attrition: 67 },
  { date: "Oct", staffing: 68, attrition: 59 },
  { date: "Nov", staffing: 74, attrition: 64 },
  { date: "Dec", staffing: 61, attrition: 55 },
];

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Creates daily points for the Week and Month views while keeping the same
 * two trend series used by the monthly and yearly views.
 */
function createDailyData(dayCount: number) {
  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const trend = Math.sin(index / 2.2) * 7;

    return {
      date: dayCount === 7 ? weekLabels[index] : `${day}`,
      staffing: Math.round(48 + trend + (index % 5) * 2),
      attrition: Math.round(40 + trend * 0.7 + (index % 4) * 2),
    };
  });
}

/**
 * Recharts-based area chart for the account overview panel.
 * The chart stays independent from the dashboard layout.
 */
export default function AccountOverviewChart({
  darkMode,
  grouping,
}: AccountOverviewChartProps) {
  const textColor = darkMode ? "#c3d0e4" : "#687993";
  const gridColor = darkMode ? "#2a4164" : "#e8eef5";

  const visibleData = useMemo(() => {
    if (grouping === "Week") {
      return createDailyData(7);
    }

    if (grouping === "Month") {
      return createDailyData(30);
    }

    if (grouping === "Quarter") {
      return chartData.slice(0, 4);
    }

    return chartData;
  }, [grouping]);

  return (
    <div
      className={`mt-3 min-w-0 h-[320px] w-full max-w-none rounded-xl border p-2 ${
        darkMode
          ? "border-[#2a3b5c] bg-[#0f1b34]"
          : "border-[#e2eaf4] bg-[#f8fbff]"
      }`}
    >
      <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={visibleData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="overview-staffing-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#73d9e8" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#73d9e8" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient
                  id="overview-attrition-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#7c75e8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c75e8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 5" vertical />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: textColor, fontSize: 10 }}
                tickMargin={8}
              />
              <YAxis
                domain={[0, 120]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: textColor, fontSize: 10 }}
                width={30}
              />
              <Tooltip
                cursor={{
                  stroke: darkMode ? "#8fa5c6" : "#b7c6d9",
                  strokeDasharray: "3 3",
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${darkMode ? "#3a5278" : "#dce6f1"}`,
                  backgroundColor: darkMode ? "#172746" : "#ffffff",
                  color: darkMode ? "#edf4ff" : "#25324d",
                  fontSize: 11,
                }}
              />
              <Legend
                verticalAlign="top"
                align="center"
                height={24}
                wrapperStyle={{ color: textColor, fontSize: 10 }}
              />
              <Area
                type="natural"
                dataKey="staffing"
                name="Workforce performance"
                stroke="#73d9e8"
                strokeWidth={2.5}
                fill="url(#overview-staffing-fill)"
                activeDot={{ r: 4 }}
              />
              <Area
                type="natural"
                dataKey="attrition"
                name="Attrition trend"
                stroke="#7c75e8"
                strokeWidth={2.5}
                fill="url(#overview-attrition-fill)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
}
