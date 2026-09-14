"use client";

import { useSyncExternalStore } from "react";
import { BarChart3, Trophy, UserRoundPlus } from "lucide-react";
import AccountSidebar from "../../components/AccountSidebar";
import AccountHeader from "./AccountHeader";

const THEME_STORAGE_KEY = "dashboard-theme";
const THEME_CHANGE_EVENT = "dashboard-theme-change";

const reasons = [
  ["Resigned", "125", "79.62%", "#16bce8"],
  ["Reprofiled", "13", "8.28%", "#ffb52c"],
  ["AWOL", "8", "5.10%", "#fa3e65"],
  ["Account Removed", "7", "4.46%", "#8b5de7"],
  ["Terminated", "2", "1.27%", "#2588e8"],
  ["Promoted", "2", "1.27%", "#12b981"],
];

const quarters = [
  ["Q1 (Jan - Mar)", "19.35%", "↓ -2.4%", "#fa3e65"],
  ["Q2 (Apr - Jun)", "56.33%", "↓ -36.9%", "#12b981"],
  ["Q3 (Jul - Sep)", "2.69%", "↑ +53.6%", "#8b5de7"],
  ["Q4 (Oct - Dec)", "0%", "↓ -2.7%", "#2588e8"],
];

function subscribeToTheme(onThemeChange: () => void) {
  window.addEventListener("storage", onThemeChange);
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);

  return () => {
    window.removeEventListener("storage", onThemeChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  };
}

function getThemeSnapshot() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
}

/**
 * Dedicated separation analysis view based on the account analytics design.
 */
export default function SeparationAnalysisPage() {
  const darkMode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => false,
  );

  const panelClass = darkMode
    ? "border-[#2a3b5c] bg-[#172746] text-[#edf4ff]"
    : "border-[#e7edf5] bg-white text-[#182746]";
  const mutedClass = darkMode ? "text-[#9aacc5]" : "text-[#687993]";

  return (
    <main
      data-account-theme={darkMode ? "dark" : "light"}
      className={`min-h-screen ${darkMode ? "bg-[#101c39]" : "bg-[#f5f8fc]"}`}
    >
      <AccountSidebar darkMode={darkMode} />
      <div className="lg:pl-[220px]">
        <section
          className={`relative min-h-[210px] overflow-hidden rounded-b-[23px] px-4 pt-4 pb-8 text-white sm:min-h-[225px] sm:px-7 ${
            darkMode
              ? "bg-[linear-gradient(119deg,#101c39,#1d3156)]"
              : "bg-[linear-gradient(119deg,#0d70dc,#48bbf5)]"
          }`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[60%] bg-contain bg-right bg-no-repeat opacity-100"
            style={{
              backgroundImage:
                "url('https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/dark_mode_hero.png')",
              filter: darkMode
                ? "none"
                : "brightness(0.45) contrast(1.1) saturate(0.8)",
            }}
          />
          <div className="relative z-10">
            <AccountHeader initialDarkMode={darkMode} />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[27px] font-bold leading-none sm:text-[29px]">
                  Separation Analysis
                </h1>
                <p className="mt-1 text-[11px] text-white/90">
                  Understand separation reasons, drivers, and quarterly trends.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col space-y-4 px-4 py-4 pb-24 sm:px-7 lg:pb-7 mt-[-10px]">
          <div className="relative z-20 mt-[-50px] grid gap-3 md:grid-cols-3">
            <SummaryCard
              label="Total Period Exits"
              value="157"
              change="↓ -12.5%"
              icon={<UserRoundPlus size={22} />}
              color="#fa3e65"
              darkMode={darkMode}
            />
            <SummaryCard
              label="Primary Separation Driver"
              value="#1 RESIGNED"
              change="125 Exits (79.62%)"
              icon={<Trophy size={22} />}
              color="#ffb52c"
              darkMode={darkMode}
            />
            <SummaryCard
              label="Secondary Driver"
              value="#2 REPROFILED"
              change="13 Exits (8.28%)"
              icon={<UserRoundPlus size={22} />}
              color="#2588e8"
              darkMode={darkMode}
            />
          </div>

          <div className="order-2 mt-4 grid gap-3 xl:grid-cols-[1.45fr_1fr]">
            <section className={`rounded-xl border p-4 shadow-sm sm:p-5 ${panelClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold">
                    Separation Reason Share (%) - Annual (Full Year)
                  </h2>
                  <p className={`mt-1 text-[10px] ${mutedClass}`}>
                    Distribution of separation reasons for the selected year.
                  </p>
                </div>
                <BarChart3 size={18} className="text-[#1689e9]" />
              </div>
              <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
                <div
                  className="grid h-48 w-48 shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(${reasons
                      .map((reason, index) => `${reason[3]} ${index * 16.666}% ${(index + 1) * 16.666}%`)
                      .join(", ")})`,
                  }}
                >
                  <div className={`grid h-28 w-28 place-items-center rounded-full ${darkMode ? "bg-[#172746]" : "bg-white"}`}>
                    <div className="text-center">
                      <strong className="block text-xl">157</strong>
                      <span className={`text-[10px] ${mutedClass}`}>Total Exits</span>
                    </div>
                  </div>
                </div>
                <div className="w-full max-w-xs space-y-3">
                  {reasons.map(([reason, exits, share, color]) => (
                    <div key={reason} className="flex items-center gap-2 text-[10px]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className={`flex-1 ${mutedClass}`}>{reason}</span>
                      <strong>{exits}</strong>
                      <strong className="w-12 text-right text-[#1689e9]">{share}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={`rounded-xl border p-4 shadow-sm sm:p-5 ${panelClass}`}>
              <h2 className="text-sm font-bold">Ranked Separation Categories</h2>
              <p className={`mt-1 text-[10px] ${mutedClass}`}>
                Top reasons for employee separations this year.
              </p>
              <div className="mt-5 space-y-4">
                {reasons.map(([reason, exits, share, color], index) => (
                  <div key={reason} className="grid grid-cols-[30px_1fr_42px] items-center gap-2 text-[10px]">
                    <span className="rounded-md px-2 py-1 text-center font-bold" style={{ backgroundColor: `${color}22`, color }}>
                      #{index + 1}
                    </span>
                    <div>
                      <div className="mb-1 flex justify-between">
                        <span>{reason}</span>
                        <span className={mutedClass}>{share}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200/60">
                        <div className="h-full rounded-full" style={{ width: share, backgroundColor: color }} />
                      </div>
                    </div>
                    <strong className="text-right">{exits}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className={`order-1 rounded-xl border p-4 shadow-sm sm:p-5 ${panelClass}`}>
            <h2 className="text-sm font-bold">Quarterly Attrition &amp; Top Reason Summary</h2>
            <p className={`mt-1 text-[10px] ${mutedClass}`}>
              Compare attrition rates and identify the top separation driver per quarter.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quarters.map(([quarter, rate, change, color]) => (
                <div key={quarter} className={`rounded-lg border p-3 ${darkMode ? "border-[#2a3b5c] bg-[#132442]" : "border-[#e7edf5] bg-[#fbfdff]"}`}>
                  <p className={`text-[10px] ${mutedClass}`}>{quarter}</p>
                  <p className="mt-2 text-lg font-bold">{rate}</p>
                  <p className="text-[10px] font-bold" style={{ color }}>{change} <span className={mutedClass}>vs previous quarter</span></p>
                  <p className={`mt-3 text-[10px] ${mutedClass}`}>Top Driver: <strong className="text-[#1689e9]">RESIGNED</strong></p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  change,
  icon,
  color,
  darkMode,
}: {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
  darkMode: boolean;
}) {
  return (
    <article className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm ${darkMode ? "border-[#2a3b5c] bg-[#172746]" : "border-[#e7edf5] bg-white"}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${color}1b`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`truncate text-[10px] font-semibold uppercase tracking-wide ${darkMode ? "text-[#d9e5f7]" : "text-[#687993]"}`}>
          {label}
        </p>
        <p className={`mt-1 truncate text-xl font-bold ${darkMode ? "text-white" : "text-[#182746]"}`}>
          {value}
        </p>
        <p className="mt-1 text-[10px] font-bold" style={{ color }}>{change}</p>
      </div>
    </article>
  );
}
