"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CircleHelp,
  Home,
  Settings,
  UsersRound,
} from "lucide-react";

/**
 * Shared navigation for every account dashboard route.
 * Keeping this in one component prevents account pages from drifting apart.
 */
type AccountSidebarProps = {
  darkMode: boolean;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
};

export default function AccountSidebar({
  darkMode,
  collapsed = false,
  mobileOpen = false,
  onClose,
}: AccountSidebarProps) {
  const pathname = usePathname();
  // Account routes use either a fixed three-segment path or a dynamic account ID.
  // Preserve the correct root depth so every navigation destination stays in
  // the current account, regardless of which subsection is currently open.
  const accountPathDepth = pathname.startsWith("/dashboard/accounts/")
    ? 4
    : 3;
  // Remove any subsection segments before composing the sidebar destinations.
  const accountBasePath = pathname
    .split("/")
    .slice(0, accountPathDepth)
    .join("/");
  // Build all destinations from the same root to keep desktop and mobile links aligned.
  const overviewPath = accountBasePath;
  const separationPath = `${accountBasePath}/separation-analysis`;
  const rosterPath = `${accountBasePath}/roster-list`;
  const settingsPath = `${accountBasePath}/settings`;
  const isOverviewActive = pathname === overviewPath;
  const isSeparationActive = pathname === separationPath;
  const isRosterActive = pathname === rosterPath;
  const isSettingsActive = pathname === settingsPath;

  return (
    <>
      {/* The backdrop is controlled by the mobile drawer styles and state. */}
      <button
        type="button"
        className="account-sidebar-backdrop"
        aria-label="Close account navigation"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onClose}
      />
      <aside
        id="account-sidebar"
        // CSS reads this attribute to switch between expanded and collapsed layouts.
        data-collapsed={collapsed}
        className="account-sidebar fixed inset-y-0 left-0 z-40 hidden w-[220px] border-r px-4 py-5 lg:block"
      >
        <Link
          href="/dashboard"
          aria-label="Operations dashboard home"
          className="account-sidebar-brand flex min-h-11 items-center gap-3 rounded-lg px-2"
        >
          <Image
            src="/ctnp-logo.png"
            alt="CTNP logo"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover object-center"
          />
          <span className="account-sidebar-label text-sm font-semibold">Operation System</span>
        </Link>
        <Link
          href="/dashboard"
          aria-label="Operation System home"
          title="Operation System home"
          className={`account-sidebar-main-link mt-5 flex items-center gap-2 px-2 text-[11px] font-semibold ${darkMode ? "text-[var(--color-muted-dark)]" : "text-[var(--color-muted-dim-4)]"}`}
        >
          <ArrowLeft size={16} /> <span className="account-sidebar-label">Operation System home</span>
        </Link>
        <nav aria-label="Operations and attrition navigation" className="mt-6 space-y-1 text-sm font-medium">
          {/* Exact route matches avoid marking a parent item active on nested pages. */}
          <Link
            href={overviewPath}
            aria-label="Core Staffing"
            aria-current={isOverviewActive ? "page" : undefined}
            title="Core Staffing"
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 ${
              isOverviewActive
                ? "bg-white/20 text-white"
                : darkMode
                  ? "text-[var(--color-ink-dark-2)] hover:bg-white/5"
                  : "hover:bg-[var(--color-table-head-light)]"
            }`}
          >
            <Home size={18} /> <span className="account-sidebar-label">Core Staffing</span>
          </Link>
          <Link
            href={separationPath}
            aria-label="Separation Analysis"
            aria-current={isSeparationActive ? "page" : undefined}
            title="Separation Analysis"
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 ${
              isSeparationActive
                ? "bg-white/20 text-white"
                : darkMode
                  ? "text-[var(--color-ink-dark-2)] hover:bg-white/5"
                  : "hover:bg-[var(--color-table-head-light)]"
            }`}
          >
            <BarChart3 size={18} /> <span className="account-sidebar-label">Separation Analysis</span>
          </Link>
          <Link
            href={rosterPath}
            aria-label="Promotion & Offboarding"
            aria-current={isRosterActive ? "page" : undefined}
            title="Promotion & Offboarding"
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 ${
              isRosterActive
                ? "bg-white/20 text-white"
                : darkMode
                  ? "text-[var(--color-ink-dark-2)] hover:bg-white/5"
                  : "hover:bg-[var(--color-table-head-light)]"
            }`}
          >
            <UsersRound size={18} />
            <span className="account-sidebar-label">Promotion &amp; Offboarding</span>
          </Link>
          <Link
            href={settingsPath}
            aria-label="Settings"
            aria-current={isSettingsActive ? "page" : undefined}
            title="Settings"
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 ${isSettingsActive ? "bg-white/20 text-white" : darkMode ? "text-[var(--color-ink-dark-2)] hover:bg-white/10" : "text-white/90 hover:bg-white/10"}`}
          >
            <Settings size={18} /> <span className="account-sidebar-label">Settings</span>
          </Link>
        </nav>
        <div
          className={`absolute right-3 bottom-16 left-3 rounded-lg px-2 py-3 ${
            "bg-white/10"
          }`}
        >
          <div className="flex gap-2">
            <CircleHelp className="text-white" size={18} />
            <div>
              <p className="text-[10px] font-bold">Need Help?</p>
              <p className="text-[9px] text-[var(--color-muted-dim)]">Contact Support</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile navigation reuses the same destinations and active-route state as desktop. */}
      <nav
        aria-label="Account navigation"
        className="account-mobile-nav fixed right-3 bottom-3 left-3 z-50 grid grid-cols-4 gap-1 rounded-xl border px-2 py-2 shadow-[0_8px_24px_var(--color-mobile-nav-shadow)] lg:hidden"
      >
        <Link
          href={overviewPath}
          aria-current={isOverviewActive ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[9px] font-medium ${
            isOverviewActive
              ? "bg-white/20 text-white"
              : "hover:bg-white/20"
          }`}
        >
          <Home size={19} />
          <span>Overview</span>
        </Link>
        <Link
          href={separationPath}
          aria-current={isSeparationActive ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[9px] font-medium ${
            isSeparationActive
              ? "bg-white/20 text-white"
              : "hover:bg-white/20"
          }`}
        >
          <BarChart3 size={19} />
          <span>Analysis</span>
        </Link>
        <Link
          href={rosterPath}
          aria-current={isRosterActive ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[9px] font-medium ${
            isRosterActive
              ? "bg-white/20 text-white"
              : "hover:bg-white/20"
          }`}
        >
          <UsersRound size={19} />
          <span className="text-center leading-tight">Promotion &amp; Offboarding</span>
        </Link>
        <Link
          href={settingsPath}
          aria-current={isSettingsActive ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[9px] font-medium ${isSettingsActive ? "bg-white/20 text-white" : "hover:bg-white/20"}`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </Link>
      </nav>
    </>
  );
}
