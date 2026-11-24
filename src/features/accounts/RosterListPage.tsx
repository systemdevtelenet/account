"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, RotateCcw, Search, UsersRound } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import AccountSidebar from "../../components/AccountSidebar";
import AccountHeader from "./AccountHeader";
import useAccountSidebar from "./useAccountSidebar";
import useDashboardTheme from "../dashboard/useDashboardTheme";
import useLiveWorkforceResource from "../workforce/useLiveWorkforceResource";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type RosterResponse = {
  canManage: boolean;
  positions: Array<{ position_id: number; position_name: string }>;
  employees: Array<{
    id: number;
    employeeCode: string;
    employeeName: string;
    position: string;
    positionId: number | null;
    department: string;
    site: string;
    hireDate: string;
    status: string;
  }>;
};

type Employee = RosterResponse["employees"][number];
const EMPTY_EMPLOYEES: Employee[] = [];

function todayInManila() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function employeeValues(employee: Employee) {
  // Keep the table, preview, and download columns in the same order.
  return [employee.employeeCode, employee.employeeName, employee.position, employee.department, employee.site, employee.hireDate, employee.status];
}

function paginationItems(activePage: number, totalPages: number): Array<number | "ellipsis"> {
  const visible = new Set([1, totalPages, activePage - 1, activePage, activePage + 1]);
  const pages = [...visible].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  for (const page of pages) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && page - previous === 2) items.push(previous + 1);
    else if (typeof previous === "number" && page - previous > 2) items.push("ellipsis");
    items.push(page);
  }

  return items;
}

/**
 * Full roster view for account workforce management.
 */
export default function RosterListPage() {
  const darkMode = useDashboardTheme();
  const sidebar = useAccountSidebar();
  const pathname = usePathname();
  const routeSegments = pathname.split("/").filter(Boolean);
  // Resolve the account slug from either supported route shape.
  const accountSlug = routeSegments[1] === "accounts" ? routeSegments[2] ?? "" : routeSegments[1] ?? "";
  const { data: rosterData, loading: rosterLoading, error: rosterError, refresh: refreshRoster } =
    useLiveWorkforceResource<RosterResponse>(`/api/accounts/${encodeURIComponent(accountSlug)}/roster`);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Employees");
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [positionFilter, setPositionFilter] = useState("All Positions");
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ employee: Employee; action: "offboard" | "promote" } | null>(null);
  const [actionDate, setActionDate] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [targetPositionId, setTargetPositionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const panelClass = darkMode ? "border-[#2a3b5c] bg-[#172746] text-[#edf4ff]" : "border-[#e7edf5] bg-white text-[#182746]";

  const employeeRows = rosterData?.employees ?? EMPTY_EMPLOYEES;
  // Use the same status groups for summary counts and the status tabs.
  const workforceCounts = useMemo(() => ({
    active: employeeRows.filter((employee) => employee.status === "Active" || employee.status === "Lateral").length,
    onLeave: employeeRows.filter((employee) => employee.status === "On Leave").length,
    other: employeeRows.filter((employee) => employee.status !== "Active" && employee.status !== "Lateral" && employee.status !== "On Leave").length,
  }), [employeeRows]);
  const displayCount = (count: number) => rosterError && !rosterData ? "Unavailable" : rosterLoading && !rosterData ? "—" : String(count);

  // Keep search, status, and role filters in one memoized result for both table and exports.
  const filteredEmployees = useMemo(() => employeeRows.filter((employee) => {
    const matchesQuery = employeeValues(employee).join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesTab = activeTab === "All Employees" ||
      (activeTab === "Active" && (employee.status === "Active" || employee.status === "Lateral")) ||
      (activeTab === "On Leave" && employee.status === "On Leave") ||
      (activeTab === "Other Statuses" && employee.status !== "Active" && employee.status !== "Lateral" && employee.status !== "On Leave");
    const matchesPosition = positionFilter === "All Positions" || employee.position === positionFilter;

    return matchesQuery && matchesTab && matchesPosition;
  }), [activeTab, employeeRows, positionFilter, query]);
  const pageLimit = pageSize === "all" ? filteredEmployees.length : Number(pageSize);
  // Clamp stale page selections after filtering and retain one page for empty results.
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / Math.max(pageLimit, 1)));
  const activePage = Math.min(currentPage, totalPages);
  const visibleEmployees = pageSize === "all"
    ? filteredEmployees
    : filteredEmployees.slice((activePage - 1) * pageLimit, activePage * pageLimit);
  const firstVisible = filteredEmployees.length === 0 ? 0 : (activePage - 1) * pageLimit + 1;
  const lastVisible = filteredEmployees.length === 0 ? 0 : Math.min(activePage * pageLimit, filteredEmployees.length);
  const positions = [...new Set(employeeRows.map((employee) => employee.position))].sort();

  const openAction = (employee: Employee, action: "offboard" | "promote") => {
    setPendingAction({ employee, action });
    setActionDate(todayInManila());
    setActionReason("");
    setTargetPositionId("");
    setActionError("");
  };

  const saveAction = async () => {
    if (!pendingAction || savingAction) return;
    setSavingAction(true);
    setActionError("");
    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(accountSlug)}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: pendingAction.employee.id,
          action: pendingAction.action,
          effectiveDate: actionDate,
          reason: pendingAction.action === "offboard" ? actionReason : null,
          toPositionId: pendingAction.action === "promote" ? Number(targetPositionId) : null,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save this roster action.");
      setPendingAction(null);
      refreshRoster();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save this roster action.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleExport = () => {
    setExportPreviewOpen(true);
  };

  const downloadExport = () => {
    // Exports use the currently filtered rows, matching what the roster view shows.
    const header = ["Employee ID", "Full Name", "Role / Designation", "Department", "Site", "Start Date", "Status"];
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csvRows = [header, ...filteredEmployees.map(employeeValues)].map((row) => row.map(escapeCsv).join(","));
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "employee-roster.csv";
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setExportPreviewOpen(false);
  };

  const downloadPdf = async () => {
    // Landscape layout gives the seven roster fields room to fit on each page.
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 842;
    const pageHeight = 595;
    const columnX = [32, 118, 258, 390, 530, 650, 750];
    const headings = ["EMPLOYEE ID", "FULL NAME", "ROLE / DESIGNATION", "DEPARTMENT", "SITE", "START DATE", "STATUS"];
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 42;

    const drawPageHeading = () => {
      page.drawText("Employee Roster", { x: 32, y, size: 18, font: boldFont, color: rgb(0.05, 0.12, 0.24) });
      y -= 30;
      headings.forEach((heading, index) => {
        page.drawText(heading, { x: columnX[index], y, size: 7, font: boldFont, color: rgb(0.35, 0.42, 0.52) });
      });
      y -= 16;
    };

    drawPageHeading();
    filteredEmployees.forEach((employee) => {
      // Start a new landscape page before the next row reaches the footer margin.
      if (y < 34) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 42;
        drawPageHeading();
      }

      employeeValues(employee).forEach((field, index) => {
        page.drawText(field, { x: columnX[index], y, size: 8, font, color: rgb(0.08, 0.13, 0.22), maxWidth: index === 1 ? 130 : 110 });
      });
      y -= 20;
    });

    const pdfBytes = await pdf.save();
    const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(pdfBytes);
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "employee-roster.pdf";
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setExportPreviewOpen(false);
  };

  return (
    <main data-account-theme={darkMode ? "dark" : "light"} data-sidebar-collapsed={sidebar.collapsed} data-sidebar-open={sidebar.mobileOpen} className={`account-screen min-h-screen ${darkMode ? "bg-[#101c39]" : "bg-[#f5f8fc]"}`}>
      <AccountSidebar darkMode={darkMode} collapsed={sidebar.collapsed} mobileOpen={sidebar.mobileOpen} onClose={sidebar.closeMobile} />
      <div className="lg:pl-[220px]">
        <section className="account-hero relative px-4 pt-4 pb-8 text-white sm:px-7">
          <div className="relative z-10">
            <AccountHeader initialDarkMode={darkMode} onMenuClick={sidebar.toggle} menuExpanded={sidebar.expanded} />
            <h1 className="mt-4 text-[27px] font-semibold leading-tight sm:text-[32px]">Employee roster</h1>
            <p className="mt-2 text-sm leading-6 text-white/85">Current employee assignments and statuses from the database.</p>
          </div>
        </section>

        <div className="account-content space-y-5 px-4 py-5 pb-24 sm:px-7 lg:pb-8">
          <div className="account-summary-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <RosterMetric label="Total employees" value={displayCount(employeeRows.length)} color="#2F6798" />
            <RosterMetric label="Active" value={displayCount(workforceCounts.active)} color="#12b981" />
            <RosterMetric label="On leave" value={displayCount(workforceCounts.onLeave)} color="#ffb52c" />
            <RosterMetric label="Other statuses" value={displayCount(workforceCounts.other)} color="#fa3e65" />
          </div>

          {rosterLoading && !rosterData && <p role="status" className="text-sm text-[#687993]">Loading roster from the database…</p>}
          {rosterError && <p role="alert" className="rounded-lg border border-[#f4c7cf] bg-[#fff5f6] px-4 py-3 text-sm text-[#b4233d]">{rosterError}</p>}
          <section className={`rounded-xl border p-3 shadow-sm sm:p-4 ${panelClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div className="flex flex-wrap gap-1 text-sm font-medium" aria-label="Filter employees by status">
                {["All Employees", "Active", "On Leave", "Other Statuses"].map((tab) => (
                  <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => { setActiveTab(tab); setCurrentPage(1); }} className={`min-h-11 rounded-lg px-3 ${activeTab === tab ? "bg-[#e8f0f6] text-[#2F6798]" : "border-transparent opacity-75 hover:bg-slate-50"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleExport} className="flex items-center gap-1 rounded-lg border border-[#dce6f1] px-3 py-2 text-[10px] font-semibold text-[#2F6798]"><Download size={13} /> Export</button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#dce6f1] px-3 py-2 text-sm text-[#687993]"><Search size={16} /><input aria-label="Search employee name, ID, or email" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employees" className="w-full bg-transparent outline-none" /></label>
              <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className="rounded-lg border border-[#dce6f1] px-3 py-2 text-[10px]" aria-label="Filter by position"><option>All Positions</option>{positions.map((position) => <option key={position}>{position}</option>)}</select>
              <button type="button" onClick={() => { setQuery(""); setActiveTab("All Employees"); setPositionFilter("All Positions"); setCurrentPage(1); }} className="flex items-center gap-1 rounded-lg border border-[#dce6f1] px-3 py-2 text-[10px] text-[#687993]"><RotateCcw size={13} /> Reset</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="min-w-[1240px] text-[10px]">
                <div className={`grid ${rosterData?.canManage ? "grid-cols-[110px_1.5fr_1fr_0.8fr_0.8fr_0.7fr_160px]" : "grid-cols-[130px_1.5fr_1fr_1fr_1fr_0.85fr]"} gap-3 rounded-md px-3 py-3 font-bold ${darkMode ? "bg-[#0b1428] text-[#8292ad]" : "bg-[#f3f7fc] text-[#687993]"}`}>
                  <span>Employee ID</span>
                  <span>Employee Name</span>
                  <span>Position</span>
                  <span>Hired Date</span>
                  <span>Site</span>
                  <span>Status</span>
                  {rosterData?.canManage && <span>Actions</span>}
                </div>
                {visibleEmployees.map((employee) => (
                  <div
                    key={employee.employeeCode}
                    className={`grid ${rosterData?.canManage ? "grid-cols-[110px_1.5fr_1fr_0.8fr_0.8fr_0.7fr_160px]" : "grid-cols-[130px_1.5fr_1fr_1fr_1fr_0.85fr]"} items-center gap-3 border-b px-3 py-3 text-sm ${darkMode ? "border-[#273653]" : "border-[#edf1f7]"}`}
                  >
                    <span className="font-bold text-[#2F6798]">{employee.employeeCode}</span>
                    <span className="truncate">{employee.employeeName}</span>
                    <span>{employee.position}</span>
                    <span>{employee.hireDate}</span>
                    <span>{employee.site}</span>
                    <span className={`font-bold ${employee.status === "Active" || employee.status === "Lateral" ? "text-[#10b981]" : employee.status === "On Leave" ? "text-[#b7791f]" : "text-[#d71945]"}`}>
                      {employee.status}
                    </span>
                    {rosterData?.canManage && (
                      <span className="flex gap-2">
                        <button type="button" onClick={() => openAction(employee, "offboard")} className={`rounded-md border border-[var(--color-rule)] px-2 py-1.5 text-xs font-semibold hover:bg-[var(--color-paper-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${darkMode ? "text-[var(--color-negative-dark)]" : "text-[var(--color-negative)]"}`}>Offboard</button>
                        <button type="button" onClick={() => openAction(employee, "promote")} className="rounded-md border border-[var(--color-rule)] px-2 py-1.5 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-paper-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">Promote</button>
                      </span>
                    )}
                  </div>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-[#687993]">No employees match these filters.</p>
                    <button type="button" onClick={() => { setQuery(""); setActiveTab("All Employees"); setPositionFilter("All Positions"); setCurrentPage(1); }} className="mt-2 min-h-11 px-3 text-sm font-semibold text-[#2F6798]">Reset filters</button>
                  </div>
                )}
              </div>
            </div>
            <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs ${darkMode ? "border-[#2a3b5c] text-[#aabbd5]" : "border-[#d8e1eb] text-[#61718b]"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(event.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Employees per page"
                  className={`min-h-9 rounded border px-2 py-1 ${darkMode ? "border-[#2a3b5c] bg-[#172746] text-[#edf4ff]" : "border-[#dce6f1] bg-white text-[#172343]"}`}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="all">All</option>
                </select>
                <span>per page</span>
                <span className="ml-2 tabular-nums">Showing {firstVisible}–{lastVisible} of {filteredEmployees.length}{filteredEmployees.length !== employeeRows.length ? ` filtered from ${employeeRows.length}` : ""}</span>
              </div>
              <nav aria-label="Roster pages" className="flex items-center gap-1.5">
                <button type="button" aria-label="Previous page" disabled={activePage === 1} onClick={() => setCurrentPage(activePage - 1)} className="grid min-h-9 min-w-9 place-items-center rounded-md border border-[var(--color-rule)] hover:bg-[var(--color-paper-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} aria-hidden="true" /></button>
                <span className="px-2 font-medium tabular-nums sm:hidden">Page {activePage} of {totalPages}</span>
                <div className="hidden items-center gap-1.5 sm:flex">
                  {paginationItems(activePage, totalPages).map((item, index) => item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} aria-hidden="true" className="grid min-w-6 place-items-center">…</span>
                  ) : (
                    <button key={item} type="button" aria-label={`Page ${item}`} aria-current={activePage === item ? "page" : undefined} onClick={() => setCurrentPage(item)} className={`min-h-9 min-w-9 rounded-md border px-2 font-medium tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${activePage === item ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "border-[var(--color-rule)] hover:bg-[var(--color-paper-2)]"}`}>
                      {item}
                    </button>
                  ))}
                </div>
                <button type="button" aria-label="Next page" disabled={activePage === totalPages} onClick={() => setCurrentPage(activePage + 1)} className="grid min-h-9 min-w-9 place-items-center rounded-md border border-[var(--color-rule)] hover:bg-[var(--color-paper-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} aria-hidden="true" /></button>
              </nav>
            </div>
          </section>
        </div>
      </div>
      {pendingAction && (
        <div className="fixed inset-0 z-[500] grid place-items-center bg-[var(--color-scrim)] p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="roster-action-title" className={`w-full max-w-md rounded-xl border p-5 shadow-2xl ${panelClass}`}>
            <h2 id="roster-action-title" className="text-lg font-semibold">{pendingAction.action === "offboard" ? "Offboard employee" : "Promote employee"}</h2>
            <p className="mt-1 text-sm">{pendingAction.employee.employeeName}</p>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium">Effective date
                <input type="date" value={actionDate} max={todayInManila()} onChange={(event) => setActionDate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-panel)] px-3 text-[var(--color-ink)]" />
              </label>
              {pendingAction.action === "offboard" ? (
                <label className="block text-sm font-medium">Reason
                  <select value={actionReason} onChange={(event) => setActionReason(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-panel)] px-3 text-[var(--color-ink)]">
                    <option value="">Select a reason</option>
                    <optgroup label="Company exit"><option value="RESIGNED">Resigned</option><option value="AWOL">AWOL</option><option value="TERMINATED">Terminated</option></optgroup>
                    <optgroup label="Account exit"><option value="ACCOUNT REMOVED">Account removed</option><option value="REPROFILED">Reprofiled</option></optgroup>
                  </select>
                </label>
              ) : (
                <label className="block text-sm font-medium">New position
                  <select value={targetPositionId} onChange={(event) => setTargetPositionId(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-panel)] px-3 text-[var(--color-ink)]">
                    <option value="">Select a position</option>
                    {(rosterData?.positions ?? []).filter((position) => position.position_id !== pendingAction.employee.positionId).map((position) => <option key={position.position_id} value={position.position_id}>{position.position_name}</option>)}
                  </select>
                </label>
              )}
              {pendingAction.action === "offboard" && <p className="text-xs text-[var(--color-muted)]">Company exit reasons also change the employee status. Account exit reasons only close this account assignment.</p>}
              {actionError && <p role="alert" className={`text-sm ${darkMode ? "text-[var(--color-negative-dark)]" : "text-[var(--color-negative)]"}`}>{actionError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={savingAction} onClick={() => setPendingAction(null)} className="min-h-11 rounded-md border border-[var(--color-rule)] px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">Cancel</button>
              <button type="button" disabled={savingAction || !actionDate || (pendingAction.action === "offboard" ? !actionReason : !targetPositionId)} onClick={() => void saveAction()} className="min-h-11 rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-50">{savingAction ? "Saving…" : pendingAction.action === "offboard" ? "Confirm offboarding" : "Confirm promotion"}</button>
            </div>
          </section>
        </div>
      )}
      {exportPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-[#071329aa] p-4 sm:p-8">
          <section className={`mx-auto flex max-h-full w-full max-w-5xl flex-col rounded-xl border p-5 shadow-2xl ${panelClass}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Export Preview</h2>
                <p className="mt-1 text-xs text-[#687993]">
                  Review the filtered employee data before downloading.
                </p>
              </div>
              <button type="button" onClick={() => setExportPreviewOpen(false)} className="text-lg text-[#687993]" aria-label="Close export preview">
                ×
              </button>
            </div>
            <div className="mt-4 overflow-auto rounded-lg border border-[#dce6f1]">
              <table className="w-full min-w-[760px] text-left text-[10px]">
                <thead className={darkMode ? "bg-[#0b1428] text-[#8292ad]" : "bg-[#f3f7fc] text-[#687993]"}>
                  <tr>
                    {['Employee ID', 'Full Name', 'Role / Designation', 'Department', 'Site', 'Start Date', 'Status'].map((heading) => (
                      <th key={heading} className="px-3 py-3 font-bold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.employeeCode} className={`border-t ${darkMode ? "border-[#273653]" : "border-[#edf1f7]"}`}>
                      {employeeValues(employee).map((field, index) => <td key={`${employee.employeeCode}-${index}`} className="px-3 py-3">{field}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEmployees.length === 0 && <p className="p-8 text-center text-xs text-[#687993]">No employees to export.</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setExportPreviewOpen(false)} className="rounded-lg border border-[#dce6f1] px-4 py-2 text-xs font-semibold">
                Cancel
              </button>
              <button type="button" onClick={downloadPdf} disabled={filteredEmployees.length === 0} className="rounded-lg border border-[#2F6798] px-4 py-2 text-xs font-bold text-[#2F6798] disabled:cursor-not-allowed disabled:opacity-50">
                Download PDF
              </button>
              <button type="button" onClick={downloadExport} disabled={filteredEmployees.length === 0} className="rounded-lg bg-[#2F6798] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                Download CSV
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function RosterMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return <article className="account-panel flex items-center gap-3 rounded-xl border border-[#e7edf5] bg-white p-4 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-full" style={{ backgroundColor: `${color}1b`, color }}><UsersRound size={21} /></span><div><p className="text-xs font-medium text-[#687993]">{label}</p><strong className="mt-1 block text-2xl tabular-nums text-[#182746]">{value}</strong></div></article>;
}
