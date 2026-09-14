"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CircleHelp,
  Home,
  UsersRound,
} from "lucide-react";

/**
 * Shared navigation for every account dashboard route.
 * Keeping this in one component prevents account pages from drifting apart.
 */
type AccountSidebarProps = {
  darkMode: boolean;
};

export default function AccountSidebar({ darkMode }: AccountSidebarProps) {
  const pathname = usePathname();
  const accountPathDepth = pathname.startsWith("/dashboard/accounts/")
    ? 4
    : 3;
  const accountBasePath = pathname
    .split("/")
    .slice(0, accountPathDepth)
    .join("/");
  const overviewPath = accountBasePath;
  const separationPath = `${accountBasePath}/separation-analysis`;
  const rosterPath = `${accountBasePath}/roster-list`;
  const isOverviewActive = pathname === overviewPath;
  const isSeparationActive = pathname === separationPath;
  const isRosterActive = pathname === rosterPath;

  return (
    <>
      <aside
        className={`account-sidebar fixed inset-y-0 left-0 z-40 hidden w-[220px] border-r px-4 py-5 lg:block ${
          darkMode
            ? "border-[#2a3b5c] bg-[#172746] text-[#edf4ff]"
            : "border-[#e8edf4] bg-white text-[#40506c]"
        }`}
      >
        <div className="flex h-16 items-center justify-center">
          <Image
            src="/logo_account.png"
            alt="CTNP logo"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover object-center"
          />
        </div>
        <Link
          href="/dashboard"
          className={`mt-5 flex items-center gap-2 px-2 text-[11px] font-semibold ${darkMode ? "text-[#aabbd5]" : "text-[#52627d]"}`}
        >
          <ArrowLeft size={16} /> Main Portal
        </Link>
        <nav className="mt-4 space-y-1 text-[11px] font-semibold">
          <Link
            href={overviewPath}
            aria-current={isOverviewActive ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-2 py-3 ${
              isOverviewActive
                ? "bg-[#dcecff] text-[#1474da]"
                : darkMode
                  ? "text-[#c3d0e4] hover:bg-white/5"
                  : "hover:bg-[#f3f7fc]"
            }`}
          >
            <Home size={18} /> Core Staffing
          </Link>
          <Link
            href={separationPath}
            aria-current={isSeparationActive ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-2 py-3 ${
              isSeparationActive
                ? "bg-[#dcecff] text-[#1474da]"
                : darkMode
                  ? "text-[#c3d0e4] hover:bg-white/5"
                  : "hover:bg-[#f3f7fc]"
            }`}
          >
            <BarChart3 size={18} /> Separation Analysis
          </Link>
          <Link
            href={rosterPath}
            aria-current={isRosterActive ? "page" : undefined}
            className={`flex items-start gap-3 rounded-lg px-2 py-3 ${
              isRosterActive
                ? "bg-[#dcecff] text-[#1474da]"
                : darkMode
                  ? "text-[#c3d0e4] hover:bg-white/5"
                  : "hover:bg-[#f3f7fc]"
            }`}
          >
            <UsersRound size={18} />
            <span>Onboarding &amp; Offboarding Workspace</span>
          </Link>
          <div
            className={`my-3 border-t ${darkMode ? "border-[#2a3b5c]" : "border-[#e7edf4]"}`}
          />
        </nav>
        <div
          className={`absolute right-3 bottom-16 left-3 rounded-lg px-2 py-3 ${
            darkMode ? "bg-[#223454]" : "bg-[#f3f7fc]"
          }`}
        >
          <div className="flex gap-2">
            <CircleHelp className="text-[#147ce5]" size={18} />
            <div>
              <p className="text-[10px] font-bold">Need Help?</p>
              <p className="text-[9px] text-[#8592a8]">Contact Support</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile navigation mirrors the desktop sidebar and stays above page content. */}
      <nav
        aria-label="Account navigation"
        className={`fixed right-3 bottom-3 left-3 z-50 grid grid-cols-4 rounded-2xl border px-2 py-2 shadow-[0_12px_35px_rgba(8,29,67,0.2)] backdrop-blur-xl lg:hidden ${
          darkMode
            ? "border-white/10 bg-[#172746]/80 text-[#c3d0e4]"
            : "border-white/70 bg-white/70 text-[#687993]"
        }`}
      >
        <a
          href={overviewPath}
          aria-current={isOverviewActive ? "page" : undefined}
          className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1 text-[9px] font-semibold ${
            isOverviewActive
              ? "bg-[#dcecff] text-[#147ce5]"
              : "hover:bg-white/20"
          }`}
        >
          <Home size={19} />
          <span>Overview</span>
        </a>
        <Link
          href={separationPath}
          aria-current={isSeparationActive ? "page" : undefined}
          className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1 text-[9px] font-semibold ${
            isSeparationActive
              ? "bg-[#dcecff] text-[#147ce5]"
              : "hover:bg-white/20"
          }`}
        >
          <BarChart3 size={19} />
          <span>Analysis</span>
        </Link>
        <a
          href={rosterPath}
          aria-current={isRosterActive ? "page" : undefined}
          className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1 text-[9px] font-semibold ${
            isRosterActive
              ? "bg-[#dcecff] text-[#147ce5]"
              : "hover:bg-white/20"
          }`}
        >
          <UsersRound size={19} />
          <span>Onboarding &amp; Offboarding</span>
        </a>
      </nav>
    </>
  );
}
