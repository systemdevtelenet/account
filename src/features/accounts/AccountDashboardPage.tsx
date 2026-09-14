"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  Search,
  Percent,
  UserRound,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import AccountSidebar from "../../components/AccountSidebar";
import AccountHeader from "./AccountHeader";
import AccountOverviewChart from "./AccountOverviewChart";

const THEME_STORAGE_KEY = "dashboard-theme";
const THEME_CHANGE_EVENT = "dashboard-theme-change";

function subscribeToTheme(onThemeChange: () => void) {
  window.addEventListener("storage", onThemeChange);
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);

  return () => {
    window.removeEventListener("storage", onThemeChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  };
}

function getThemeSnapshot() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme) {
    return storedTheme === "dark";
  }

  return document.cookie
    .split("; ")
    .some((cookie) => cookie === `${THEME_STORAGE_KEY}=dark`);
}

type SummaryItem = { label: string; value: string };

type AccountDashboardPageProps = {
  shortTitle: string;
  fullTitle: string;
  description: string;
  summaryItems: SummaryItem[];
};

const employees = [
  ["GEN-1534", "Abdellah Nohreen Dsimomba", "AN", "#2588e8"],
  ["GEN-1903", "Benjamin Cuizon", "BC", "#a36be8"],
  ["GEN-7062", "Carl Noven Enriquez", "CE", "#29b9b1"],
  ["GEN-3975", "Darin Vic Ecle", "DE", "#f6a016"],
  ["GEN-2963", "Edwin Romerosa", "ER", "#fa4968"],
  ["GEN-5244", "Francisco Martin Cayada", "FM", "#2588e8"],
  ["GEN-9910", "Francisjell Yongco", "FY", "#8a5de4"],
  ["GEN-6768", "Gabriel Pillario", "GP", "#24b89c"],
  ["GEN-1409", "Gay Marie Cinco", "GC", "#f1a019"],
  ["GEN-5433", "Hezel Mae Domo", "HD", "#f34e6d"],
];

// This card is data-driven so new account metrics can reuse the same visual
// treatment without duplicating the card markup.
function KpiCard({
  label,
  value,
  change,
  positive,
  color,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <article className="account-panel relative overflow-hidden rounded-xl border border-[#e9eef5] bg-white px-3 py-3 shadow-[0_4px_18px_rgba(54,88,125,0.07)] sm:px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
        <span
          className="absolute -right-10 bottom-[-22px] h-24 w-64 rotate-[-8deg] rounded-[50%] border-t-2"
          style={{ borderTopColor: `${color}55` }}
        />
        <span
          className="absolute -right-16 bottom-[-35px] h-24 w-72 rotate-[-8deg] rounded-[50%] border-t"
          style={{ borderTopColor: `${color}35` }}
        />
      </div>
      <div className="relative z-10 flex items-start gap-3">
        {icon && (
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: `${color}1b`, color }}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#465572] sm:text-[11px]">
            {label}
          </p>
          <p className="mt-0.5 text-[23px] font-bold leading-none text-[#111d40] sm:text-[26px]">
            {value}
          </p>
          <p
            className={`account-change mt-2 text-[11px] font-bold ${positive ? "account-positive" : "account-negative"}`}
          >
            {positive ? "↑" : "↓"} {change}
          </p>
          <p className="text-[9px] text-[#8b98ad]">vs last month</p>
        </div>
      </div>
    </article>
  );
}

export default function AccountDashboardPage({
  fullTitle,
  description,
}: AccountDashboardPageProps) {
  const darkMode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => false,
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [grouping, setGrouping] = useState("Month");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [actionPanel, setActionPanel] = useState<"onboard" | "offboard" | null>(
    null,
  );

  const filteredEmployees = employees.filter((employee) =>
    employee
      .slice(0, 2)
      .some((value) =>
        value.toLowerCase().includes(employeeQuery.toLowerCase()),
      ),
  );

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));

  return (
    <main
      id="settings"
      data-account-theme={darkMode ? "dark" : "light"}
      className={`account-page min-h-screen ${
        darkMode ? "bg-[#101c39] text-[#edf4ff]" : "bg-[#f4f7fb] text-[#172343]"
      }`}
    >
      <AccountSidebar darkMode={darkMode} />

      <div className="lg:pl-[220px]">
        <section
          id="core-staffing"
          className={`relative min-h-[210px] overflow-hidden rounded-b-[23px] px-4 pt-4 pb-8 text-white transition-colors duration-300 sm:min-h-[225px] sm:px-7 lg:px-7 ${
            darkMode
              ? "bg-[radial-gradient(circle_at_72%_-45%,#263a63_0_19%,transparent_40%),linear-gradient(119deg,#101c39_0%,#152442_51%,#1d3156_100%)]"
              : "bg-[radial-gradient(circle_at_72%_-45%,#44bdf6_0_19%,transparent_40%),linear-gradient(119deg,#0d70dc_0%,#137ddd_51%,#48bbf5_100%)]"
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
          <div className="relative w-full">
            <AccountHeader initialDarkMode={darkMode} />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[27px] font-bold leading-none sm:text-[29px]">
                  Core Staffing
                </h1>
                <p className="mt-1 text-[11px] text-white/90">
                  {description ||
                    "Monitor your workforce, track separations and analyze attrition trends."}
                </p>
              </div>
              <div className="hidden items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen((open) => !open)}
                    className="flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-[10px] font-semibold"
                  >
                    <CalendarDays size={14} /> {formatDate(startDate)} –{" "}
                    {formatDate(endDate)} <ChevronDown size={12} />
                  </button>
                  {datePickerOpen && (
                    <div className="absolute top-11 right-0 z-30 w-64 rounded-lg bg-white p-3 text-[10px] text-slate-700 shadow-lg">
                      <p className="font-bold">Select date range</p>
                      <label className="mt-2 block">
                        Start date
                        <input
                          type="date"
                          value={startDate}
                          onChange={(event) => setStartDate(event.target.value)}
                          className="mt-1 block w-full rounded border border-slate-200 p-2"
                        />
                      </label>
                      <label className="mt-2 block">
                        End date
                        <input
                          type="date"
                          min={startDate}
                          value={endDate}
                          onChange={(event) => setEndDate(event.target.value)}
                          className="mt-1 block w-full rounded border border-slate-200 p-2"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setDatePickerOpen(false)}
                        className="mt-3 rounded bg-[#1479df] px-3 py-2 font-bold text-white"
                      >
                        Apply dates
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActionPanel("onboard")}
                  className="hidden h-9 rounded-lg bg-white px-4 text-[10px] font-bold text-[#1679df] sm:block"
                >
                  + ONBOARD
                </button>
                <button
                  type="button"
                  onClick={() => setActionPanel("offboard")}
                  className="hidden h-9 rounded-lg bg-[#fa6072] px-4 text-[10px] font-bold sm:block"
                >
                  <X className="mr-1 inline" size={13} /> OFFBOARD
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="relative z-10 w-full px-4 pb-24 sm:px-7 lg:px-7 lg:pb-8">
          <div className="relative z-20 mt-[-50px] grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="ACTIVE OPERATIONAL ROSTER"
              value="742"
              change="+ 4.2%"
              positive
              color="#2689e9"
              icon={<UsersRound size={22} />}
            />
            <KpiCard
              label="SEPARATED WORKFORCE COUNT"
              value="6"
              change="- 8.1%"
              positive={false}
              color="#f05b83"
              icon={<UserRoundPlus size={22} />}
            />
            <KpiCard
              label="CALCULATED ATTRITION RATE"
              value="18%"
              change="+ 6.3%"
              positive
              color="#f2ab27"
              icon={<Percent size={22} />}
            />
          </div>

          <div className="mt-4 grid items-start gap-3">
            <section
              id="separation-analysis"
              className="account-panel rounded-xl border border-[#e9eef5] bg-white p-4 shadow-[0_4px_18px_rgba(54,88,125,0.06)] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f3ff] text-[#147ce5]">
                    <BarChart3 size={17} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">Overview</h2>
                    <p className="text-[10px] text-[#7b89a0]">
                      Workforce performance and account activity.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#7b89a0]">
                  {['Week', 'Month', 'Quarter', 'Year'].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setGrouping(period)}
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
              <AccountOverviewChart darkMode={darkMode} grouping={grouping} />
            </section>

            <section
              id="onboarding-offboarding"
              className="account-panel rounded-xl border border-[#e9eef5] bg-white p-4 shadow-[0_4px_18px_rgba(54,88,125,0.06)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f3ff] text-[#147ce5]">
                    <UsersRound size={17} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">
                      Active Roster Recent Preview
                    </h2>
                    <p className="text-[10px] text-[#7b89a0]">
                      Showing the latest active employees in the roster.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmployeeQuery("")}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#0879e9]"
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
                {filteredEmployees.map(([id, name, initials, color]) => (
                  <div
                    key={id}
                    className="grid grid-cols-[.8fr_1.7fr_1fr_.8fr] items-center border-t border-[#edf1f5] px-2 py-1.5 text-[9px] text-[#4d5c75] sm:px-3"
                  >
                    <span>{id}</span>
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <i
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[8px] font-bold text-white not-italic"
                        style={{ backgroundColor: color }}
                      >
                        {initials}
                      </i>
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="text-[#8c98aa]">N/A</span>
                    <span className="flex items-center gap-1 text-[#00a76d]">
                      <i className="h-1.5 w-1.5 rounded-full bg-[#00a76d]" />
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {actionPanel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0d1d3b66] p-4">
          <form
            className="w-full max-w-md rounded-xl bg-white p-5 text-slate-800 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              setActionPanel(null);
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">
                  {actionPanel === "onboard"
                    ? "Onboard employee"
                    : "Offboard employee"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {actionPanel === "onboard"
                    ? "Add a new employee to the active roster."
                    : "Record an employee separation from the roster."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close action form"
                onClick={() => setActionPanel(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mt-4 block text-xs font-semibold">
              Employee name
              <input
                required
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Enter employee name"
              />
            </label>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-[#1479df] px-4 py-2 text-xs font-bold text-white"
            >
              Save {actionPanel === "onboard" ? "employee" : "separation"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
