"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { Download, RotateCcw, Search, UsersRound } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import AccountSidebar from "../../components/AccountSidebar";
import AccountHeader from "./AccountHeader";

const THEME_STORAGE_KEY = "dashboard-theme";
const THEME_CHANGE_EVENT = "dashboard-theme-change";
const TOTAL_EMPLOYEES = 185;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type Employee = [
  string,
  string,
  string,
  string,
  string,
  string,
  "Active" | "On Leave" | "Separated",
];

const employees: Employee[] = [
  ["GEN-5316", "Abdellah Nohreen Dsimomba", "N/A", "JR. LEADERSHIP (NEGOT)", "FAUSTINA LEADER", "2019-02-18", "Active"],
  ["GEN-1851", "Benjamin Cuizon", "N/A", "JR. LEADERSHIP (CXL)", "FAUSTINA LEADER", "2024-07-14", "Active"],
  ["GEN-1741", "Carl Noven Enriquez", "N/A", "JR. LEADERSHIP (CXL)", "FAUSTINA LEADER", "2024-11-03", "Active"],
  ["GEN-3410", "Darin Vic Ecle", "N/A", "JR. LEADERSHIP (CXL)", "FAUSTINA LEADER", "2022-03-01", "Active"],
  ["GEN-2397", "Edwin Romerosa", "N/A", "LEADERSHIP SR.", "FAUSTINA LEADER", "2020-04-05", "Active"],
  ["GEN-5317", "Francisco Martin Cayada", "N/A", "JR. LEADERSHIP (CXL)", "ALABANG LEADER", "2024-11-24", "Active"],
  ["GEN-9910", "Francisjell Yongco", "N/A", "JR. LEADERSHIP (CXL)", "FAUSTINA LEADER", "2021-11-14", "Active"],
  ["GEN-6703", "Gabriel Pillario", "N/A", "JR. LEADERSHIP (CXL)", "FAUSTINA LEADER", "2020-03-10", "Active"],
  ["GEN-9301", "Gay Marie Cinco", "N/A", "JR. LEADERSHIP (NEGOT)", "FAUSTINA LEADER", "2023-01-10", "Active"],
  ["GEN-5476", "Hezel Mae Domo", "N/A", "JR. LEADERSHIP (CXL)", "FAUSTINA LEADER", "2020-06-02", "Active"],
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
 * Full roster view for account workforce management.
 */
export default function RosterListPage() {
  const darkMode = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);
  const [employeeRows, setEmployeeRows] = useState<Employee[]>(employees);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All Employees");
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [actionPanel, setActionPanel] = useState<"onboard" | "offboard" | null>(null);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const panelClass = darkMode ? "border-[#2a3b5c] bg-[#172746] text-[#edf4ff]" : "border-[#e7edf5] bg-white text-[#182746]";
  const filteredEmployees = useMemo(() => employeeRows.filter((employee) => {
    const matchesQuery = employee.join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesTab = activeTab === "All Employees" || employee[6] === activeTab;
    const matchesRole = roleFilter === "All Roles" || employee[2] === roleFilter;

    return matchesQuery && matchesTab && matchesRole;
  }), [activeTab, employeeRows, query, roleFilter]);
  const pageLimit = pageSize === "all" ? filteredEmployees.length : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / Math.max(pageLimit, 1)));
  const activePage = Math.min(currentPage, totalPages);
  const visibleEmployees = pageSize === "all"
    ? filteredEmployees
    : filteredEmployees.slice((activePage - 1) * pageLimit, activePage * pageLimit);

  const handleExport = () => {
    setExportPreviewOpen(true);
  };

  const downloadExport = () => {
    const header = ["Employee ID", "Full Name", "Role / Designation", "Department", "Site", "Start Date", "Status"];
    const csvRows = [header, ...filteredEmployees].map((row) => row.join(","));
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
      if (y < 34) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - 42;
        drawPageHeading();
      }

      employee.forEach((field, index) => {
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

  const handleEmployeeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    if (!name || !actionPanel) return;

    const nextEmployee: Employee = [
      String(formData.get("employeeId") ?? `GEN-${Date.now().toString().slice(-4)}`),
      name,
      String(formData.get("role") ?? "N/A"),
      String(formData.get("department") ?? "N/A"),
      String(formData.get("site") ?? "N/A"),
      String(formData.get("startDate") ?? new Date().toISOString().slice(0, 10)),
      actionPanel === "onboard" ? "Active" : "Separated",
    ];

    setEmployeeRows((currentRows) => [nextEmployee, ...currentRows]);
    setActionPanel(null);
  };

  return (
    <main data-account-theme={darkMode ? "dark" : "light"} className={`min-h-screen ${darkMode ? "bg-[#101c39]" : "bg-[#f5f8fc]"}`}>
      <AccountSidebar darkMode={darkMode} />
      <div className="lg:pl-[220px]">
        <section className={`relative overflow-hidden rounded-b-[23px] px-4 pt-4 pb-8 text-white sm:min-h-[225px] sm:px-7 ${darkMode ? "bg-[linear-gradient(119deg,#101c39,#1d3156)]" : "bg-[linear-gradient(119deg,#0d70dc,#48bbf5)]"}`}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[60%] bg-contain bg-right bg-no-repeat opacity-100" style={{ backgroundImage: "url('https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/dark_mode_hero.png')", filter: darkMode ? "none" : "brightness(0.45) contrast(1.1) saturate(0.8)" }} />
          <div className="relative z-10">
            <AccountHeader initialDarkMode={darkMode} />
            <h1 className="mt-4 text-[27px] font-bold leading-none sm:text-[29px]">Onboarding &amp; Offboarding Workspace</h1>
            <p className="mt-1 text-[11px] text-white/90">View and manage your active workforce roster.</p>
          </div>
        </section>

        <div className="space-y-3 px-4 py-4 pb-24 sm:px-7 lg:pb-7">
          <div className="relative z-20 mt-[-50px] grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <RosterMetric label="Total Employees" value="185" color="#2588e8" />
            <RosterMetric label="Active" value="172" color="#12b981" />
            <RosterMetric label="On Leave" value="8" color="#ffb52c" />
            <RosterMetric label="Separated" value="5" color="#fa3e65" />
          </div>

          <section className={`rounded-xl border p-3 shadow-sm sm:p-4 ${panelClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div className="flex gap-5 text-[11px] font-semibold">
                {["All Employees", "Active", "On Leave", "Separated"].map((tab) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`border-b-2 pb-3 ${activeTab === tab ? "border-[#147ce5] text-[#147ce5]" : "border-transparent opacity-70"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleExport} className="flex items-center gap-1 rounded-lg border border-[#dce6f1] px-3 py-2 text-[10px] font-semibold text-[#147ce5]"><Download size={13} /> Export</button>
                <button type="button" onClick={() => setActionPanel("onboard")} className="rounded-lg bg-[#1688e8] px-4 py-2 text-[10px] font-bold text-white">+ ONBOARD</button>
                <button type="button" onClick={() => setActionPanel("offboard")} className="rounded-lg bg-[#d71945] px-4 py-2 text-[10px] font-bold text-white">× OFFBOARD</button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#dce6f1] px-3 py-2 text-[10px] text-[#687993]"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, ID, or email..." className="w-full bg-transparent outline-none" /></label>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-lg border border-[#dce6f1] px-3 py-2 text-[10px]" aria-label="All roles"><option>All Roles</option><option>Agent</option><option>QA</option><option>N/A</option></select>
              <button type="button" onClick={() => { setQuery(""); setActiveTab("All Employees"); setRoleFilter("All Roles"); }} className="flex items-center gap-1 rounded-lg border border-[#dce6f1] px-3 py-2 text-[10px] text-[#687993]"><RotateCcw size={13} /> Reset</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="min-w-[900px] text-[10px]">
                <div className={`grid grid-cols-[140px_1.35fr_1fr_1.5fr_1.35fr_1fr_0.8fr] gap-3 rounded-md px-3 py-3 font-bold ${darkMode ? "bg-[#0b1428] text-[#8292ad]" : "bg-[#f3f7fc] text-[#687993]"}`}>
                  <span>EMPLOYEE ID</span>
                  <span>FULL NAME</span>
                  <span>ROLE / DESIGNATION</span>
                  <span>DEPARTMENT</span>
                  <span>SITE</span>
                  <span>START DATE</span>
                  <span>STATUS</span>
                </div>
                {visibleEmployees.map((employee) => (
                  <div
                    key={employee[0]}
                    className={`grid grid-cols-[140px_1.35fr_1fr_1.5fr_1.35fr_1fr_0.8fr] items-center gap-3 border-b px-3 py-3 font-semibold ${darkMode ? "border-[#273653]" : "border-[#edf1f7]"}`}
                  >
                    <span className="font-bold text-[#10bddd]">{employee[0]}</span>
                    <span className="truncate">{employee[1]}</span>
                    <span>{employee[2]}</span>
                    <span>{employee[3]}</span>
                    <span>{employee[4]}</span>
                    <span>{employee[5]}</span>
                    <span className="font-bold text-[#10b981]">{employee[6]}</span>
                  </div>
                ))}
                {filteredEmployees.length === 0 && <p className="py-8 text-center text-[#687993]">No employees found.</p>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[10px] text-[#687993]">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(event.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Employees per page"
                  className="rounded border border-[#dce6f1] bg-transparent px-2 py-1"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="all">All</option>
                </select>
                <span>of {TOTAL_EMPLOYEES} employees</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" disabled={activePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40">‹</button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`rounded border px-2 py-1 ${activePage === page ? "border-[#147ce5] bg-[#147ce5] text-white" : ""}`}>
                    {page}
                  </button>
                ))}
                <button type="button" disabled={activePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40">›</button>
              </div>
            </div>
          </section>
        </div>
      </div>
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
                    <tr key={employee[0]} className={`border-t ${darkMode ? "border-[#273653]" : "border-[#edf1f7]"}`}>
                      {employee.map((field) => <td key={field} className="px-3 py-3">{field}</td>)}
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
              <button type="button" onClick={downloadPdf} disabled={filteredEmployees.length === 0} className="rounded-lg border border-[#1688e8] px-4 py-2 text-xs font-bold text-[#1688e8] disabled:cursor-not-allowed disabled:opacity-50">
                Download PDF
              </button>
              <button type="button" onClick={downloadExport} disabled={filteredEmployees.length === 0} className="rounded-lg bg-[#1688e8] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                Download CSV
              </button>
            </div>
          </section>
        </div>
      )}
      {actionPanel && (
        <div className="fixed inset-0 z-50 bg-[#071329aa]">
          <button
            type="button"
            onClick={() => setActionPanel(null)}
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close employee drawer"
          />
          <form
            onSubmit={handleEmployeeSubmit}
            className={`relative ml-auto h-full w-full max-w-md overflow-y-auto rounded-l-2xl border p-5 shadow-2xl ${actionPanel === "offboard" ? "border-[#d71945]" : "border-[#1688e8]"} ${panelClass}`}
            style={{
              animation: "drawer-in 240ms ease-out",
              borderColor: actionPanel === "offboard" ? "#d71945" : "#1688e8",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-lg font-bold uppercase ${actionPanel === "offboard" ? "text-[#ff4d6d]" : "text-[#18c4e9]"}`}>
                  {actionPanel === "onboard" ? "+ Onboard New Staff Entry" : "× Offboard Staff Entry"}
                </h2>
                <p className="mt-1 text-xs text-[#687993]">
                  {actionPanel === "onboard"
                    ? "Register new team members directly into the active account roster."
                    : "Record a staff separation from the active account roster."}
                </p>
              </div>
              <button type="button" onClick={() => setActionPanel(null)} className="text-lg text-[#687993]" aria-label="Close">
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold">
                Employee ID
                <input name="employeeId" placeholder="e.g. EMP-2026" required className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 font-normal outline-none placeholder:text-[#687993]" />
              </label>
              <label className="text-xs font-semibold">
                Full Name
                <input name="name" placeholder="e.g. Jane Doe" required className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 font-normal outline-none placeholder:text-[#687993]" />
              </label>
              <label className="text-xs font-semibold">
                Gender
                <select name="gender" defaultValue="Female" className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 font-normal outline-none">
                  <option>Female</option>
                  <option>Male</option>
                  <option>Prefer not to say</option>
                </select>
              </label>
              <label className="text-xs font-semibold">
                Department / Team
                <input name="department" placeholder="e.g. CXL, NEGOT, Leadership" required className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 font-normal outline-none placeholder:text-[#687993]" />
              </label>
              <label className="text-xs font-semibold">
                Position / Role
                <input name="role" placeholder="e.g. Customer Support Agent" defaultValue="N/A" className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 font-normal outline-none placeholder:text-[#687993]" />
              </label>
              <label className="text-xs font-semibold">
                Site Assignment
                <input name="site" placeholder="e.g. Cebu Faustina" required className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 font-normal outline-none placeholder:text-[#687993]" />
              </label>
              <label className="text-xs font-semibold">
                {actionPanel === "onboard" ? "Start / Hire Date" : "Separation Date"}
                <input name="startDate" type="date" required className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 font-normal outline-none" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="reset" className="rounded-lg border border-[#dce6f1] px-4 py-2 text-xs font-semibold">
                Reset Form
              </button>
              <button type="submit" className={`rounded-lg px-4 py-2 text-xs font-bold text-white ${actionPanel === "offboard" ? "bg-[#d71945]" : "bg-[#1688e8]"}`}>
                + Register Staff
              </button>
            </div>
          </form>
          <style>{`@keyframes drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </div>
      )}
    </main>
  );
}

function RosterMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return <article className="account-panel flex items-center gap-3 rounded-xl border border-[#e7edf5] bg-white p-4 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-full" style={{ backgroundColor: `${color}1b`, color }}><UsersRound size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#687993]">{label}</p><strong className="mt-1 block text-2xl text-[#182746]">{value}</strong><p className="text-[9px] text-[#12a66a]">↑ +4.2% <span className="text-[#687993]">vs last month</span></p></div></article>;
}
