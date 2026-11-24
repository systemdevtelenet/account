"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Bell, ChevronDown, Moon, Search, Sun } from "lucide-react";
import useCurrentRole from "../features/auth/useCurrentRole";
import useDashboardTheme, {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "../features/dashboard/useDashboardTheme";
import {
  getAccountSearchSnapshot,
  getServerAccountSearchSnapshot,
  setAccountSearch,
  subscribeToAccountSearch,
} from "../lib/account-search";
import NotificationPanel from "./NotificationPanel";

type HeaderProps = {
  initialDarkMode?: boolean;
};

// Render the portal header and manage its search, theme, notification, and profile controls.
export default function Header({ initialDarkMode = false }: HeaderProps) {
  // Get the current user's role details for the profile control.
  const { roleLabel, initials } = useCurrentRole();
  // Use the router to navigate after a successful sign-out request.
  const router = useRouter();
  // Avoid re-navigating when a search is submitted from the dashboard itself.
  const pathname = usePathname();
  // Subscribe to browser theme changes; use the initial value during server rendering.
  const darkMode = useDashboardTheme(initialDarkMode);
  const accountSearch = useSyncExternalStore(
    subscribeToAccountSearch,
    getAccountSearchSnapshot,
    getServerAccountSearchSnapshot,
  );
  // Track visibility of the header's interactive panels and search field.
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Hold the search input so it can be focused when search opens.
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sign out the user, navigate to login, and refresh the current route.
  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  // Toggle search visibility and focus the input after it enters the layout.
  const toggleSearch = () => {
    // Compute and store the next visibility state.
    const nextSearchState = !searchOpen;
    setSearchOpen(nextSearchState);

    if (nextSearchState) {
      // Wait for the expanding search field to enter the layout before focusing it.
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  };

  // Toggle the active theme and persist it for future visits.
  const toggleTheme = () => {
    // Select the theme opposite to the current setting.
    const nextTheme = darkMode ? "light" : "dark";

    // Store the preference in both browser storage mechanisms.
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.cookie = `${THEME_STORAGE_KEY}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    // Update document styling immediately, then notify theme subscribers.
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  // Render the brand and all header controls and their conditional panels.
  return (
    <header className="portal-header fixed inset-x-0 top-0 z-[300] flex h-[72px] items-center justify-between px-4 sm:h-[84px] sm:px-6 xl:px-8">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="grid h-[45px] w-[45px] shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[#1468d9] shadow-[0_4px_12px_#0759b644] sm:h-[57px] sm:w-[57px]">
          <Image
            src="/ctnp-logo.png"
            alt="CTNP logo"
            width={40}
            height={40}
            className="h-8 w-8 rounded-full sm:h-10 sm:w-10"
          />
        </div>
        <div className="text-[15px] sm:text-xl">
          Operation System
        </div>
      </div>

      <div className="relative flex items-center gap-1.5 sm:gap-2.5">
        <div
          className={`flex h-9 items-center overflow-hidden rounded-full border border-white/30 bg-[#055bbe33] text-[#d9edff] transition-[background-color,border-color] duration-200 focus-within:border-white/70 focus-within:bg-[#055bbe61] sm:h-10 ${
            searchOpen
              ? "absolute right-0 z-[60] w-[min(210px,calc(100vw-28px))] bg-[#0b69c9] sm:static sm:w-[210px] sm:bg-[#055bbe61]"
              : "w-9 sm:w-10"
          }`}
        >
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center bg-transparent text-inherit"
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            onClick={toggleSearch}
          >
            <Search aria-hidden="true" size={18} />
          </button>
          <input
            ref={searchInputRef}
            className={`w-[150px] min-w-[150px] translate-x-2 bg-transparent text-xs text-white outline-none transition-[opacity,transform] duration-200 placeholder:text-[#d4eaff] ${
              searchOpen ? "translate-x-0 opacity-100" : "opacity-0"
            }`}
            aria-label="Search accounts"
            placeholder="Search accounts"
            tabIndex={searchOpen ? 0 : -1}
            value={accountSearch}
            onChange={(event) => setAccountSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (pathname !== "/dashboard") router.push("/dashboard");
              } else if (event.key === "Escape") {
                setAccountSearch("");
                setSearchOpen(false);
              }
            }}
            onBlur={(event) => {
              if (!event.currentTarget.value) setSearchOpen(false);
            }}
          />
        </div>

        <button
          type="button"
          aria-pressed={darkMode}
          className="hidden h-10 w-10 place-items-center rounded-full bg-[#055bbe1f] transition-colors hover:bg-white/15 sm:grid"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
        >
          {darkMode ? (
            <Sun aria-hidden="true" size={24} />
          ) : (
            <Moon aria-hidden="true" size={24} />
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            className="relative grid h-11 w-11 place-items-center rounded-full bg-[#055bbe1f] transition-colors hover:bg-white/15"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            aria-controls="portal-notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Bell aria-hidden="true" size={24} />
          </button>

          {notificationsOpen && (
            <NotificationPanel darkMode={darkMode} />
          )}
        </div>

        <button
          type="button"
          aria-expanded={profileOpen}
          className={`flex h-[39px] items-center gap-2 rounded-[28px] border py-1 pr-2 pl-1 font-bold transition-colors sm:h-[45px] sm:gap-[11px] sm:pr-[13px] ${
            darkMode
              ? "border-white/15 bg-[#172746] text-white"
              : "border-transparent bg-[#f5f8ff] text-[#101a39]"
          }`}
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#101a32] text-sm text-white sm:h-[37px] sm:w-[37px]">
            {initials}
          </span>
          <span className="hidden sm:inline">{roleLabel}</span>
          <ChevronDown aria-hidden="true" className="ml-1 sm:ml-2" size={12} />
        </button>

        {profileOpen && (
          <div
            className={`account-menu absolute top-[53px] right-0 z-50 min-w-40 rounded-[10px] px-[18px] py-3.5 text-[13px] leading-8 shadow-[0_8px_25px_#0927612c] ${darkMode ? "bg-[#172746] text-[#edf4ff]" : "bg-white text-[#17213b]"}`}
          >
            <strong className="block leading-5">{roleLabel}</strong>
            <small
              className={`mt-[3px] block text-[11px] leading-4 ${darkMode ? "text-[#aabbd5]" : "text-[#7182a0]"}`}
            >
              {roleLabel}
            </small>
            <hr
              className={`my-2.5 border-0 border-t ${darkMode ? "border-[#2b3e61]" : "border-[#edf1f7]"}`}
            />
            <button
              type="button"
              className={`block bg-transparent py-1 text-[13px] ${darkMode ? "text-[#edf4ff]" : "text-[#17213b]"}`}
            >
              Account settings
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className={`block bg-transparent py-1 text-[13px] ${darkMode ? "text-[#edf4ff]" : "text-[#17213b]"}`}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
