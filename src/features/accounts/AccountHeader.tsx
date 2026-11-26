"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Menu, Moon, Search, Sun } from "lucide-react";
import useCurrentRole from "../auth/useCurrentRole";
import useDashboardTheme, {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "../dashboard/useDashboardTheme";
import {
  getAccountSearchSnapshot,
  getServerAccountSearchSnapshot,
  setAccountSearch,
  subscribeToAccountSearch,
} from "../../lib/account-search";
import NotificationPanel from "../../components/NotificationPanel";
import UserAvatar from "../../components/UserAvatar";

type HeaderProps = {
  initialDarkMode?: boolean;
  onMenuClick?: () => void;
  menuExpanded?: boolean;
};

export default function AccountHeader({
  initialDarkMode = false,
  onMenuClick,
  menuExpanded = false,
}: HeaderProps) {
  const { roleLabel, displayName, email, avatarUrl, initials } = useCurrentRole();
  const router = useRouter();
  const darkMode = useDashboardTheme(initialDarkMode);
  const accountSearch = useSyncExternalStore(
    subscribeToAccountSearch,
    getAccountSearchSnapshot,
    getServerAccountSearchSnapshot,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const toggleSearch = () => {
    const nextSearchState = !searchOpen;
    setSearchOpen(nextSearchState);

    if (nextSearchState) {
      // Wait for the expanding search field to enter the layout before focusing it.
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  };

  const toggleTheme = () => {
    const nextTheme = darkMode ? "light" : "dark";

    // Keep local storage, the cookie, and document styles in sync so the
    // selected theme survives refreshes without waiting for a server render.
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.cookie = `${THEME_STORAGE_KEY}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <header className="account-header relative z-30 flex items-center justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          className="account-sidebar-toggle grid h-10 w-10 place-items-center rounded-lg"
          aria-label={menuExpanded ? "Close navigation" : "Open navigation"}
          aria-controls="account-sidebar"
          aria-expanded={menuExpanded}
          onClick={onMenuClick}
        >
          <Menu aria-hidden="true" size={21} />
        </button>
        <div className="text-[15px] sm:text-xl">
          Accounts
        </div>
      </div>

      <div className="relative flex items-center gap-1.5 sm:gap-2.5">
        <div
          className={`flex h-9 items-center overflow-hidden rounded-full border border-white/30 bg-[var(--color-brand-soft-33)] text-[var(--color-ink-on-brand)] transition-[background-color,border-color] duration-200 focus-within:border-white/70 focus-within:bg-[var(--color-brand-soft-61)] sm:h-10 ${
            searchOpen
              ? "absolute right-0 z-[60] w-[min(210px,calc(100vw-28px))] bg-[var(--color-accent)] sm:static sm:w-[210px] sm:bg-[var(--color-brand-soft-61)]"
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
            className={`w-[150px] min-w-[150px] translate-x-2 bg-transparent text-xs text-white outline-none transition-[opacity,transform] duration-200 placeholder:text-[var(--color-placeholder-on-brand)] ${
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
                router.push("/dashboard");
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
          className="hidden h-10 w-10 place-items-center rounded-full bg-[var(--color-brand-soft-20)] transition-colors hover:bg-white/15 sm:grid"
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
            className="relative grid h-10 w-10 place-items-center rounded-full bg-[var(--color-brand-soft-20)] transition-colors hover:bg-white/15"
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
          aria-label={`Account menu for ${displayName}`}
          aria-expanded={profileOpen}
          className="flex h-[39px] items-center gap-2 rounded-[28px] border py-1 pr-2 pl-1 font-bold transition-colors sm:h-[45px] sm:gap-[11px] sm:pr-[13px]"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <UserAvatar avatarUrl={avatarUrl} initials={initials} />
          <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
          <ChevronDown aria-hidden="true" className="ml-1 sm:ml-2" size={12} />
        </button>

        {profileOpen && (
          <div
            className={`account-menu absolute top-[53px] right-0 z-50 min-w-40 rounded-[10px] px-[18px] py-3.5 text-[13px] leading-8 shadow-[0_8px_25px_var(--color-shadow-menu)] ${darkMode ? "bg-[var(--color-panel-dark)] text-[var(--color-ink-dark)]" : "bg-white text-[var(--color-ink-menu)]"}`}
          >
            <strong className="block leading-5">{displayName}</strong>
            <small
              className={`mt-[3px] block text-[11px] leading-4 ${darkMode ? "text-[var(--color-muted-dark)]" : "text-[var(--color-muted-3)]"}`}
            >
              {email ? `${email} · ${roleLabel}` : roleLabel}
            </small>
            <hr
              className={`my-2.5 border-0 border-t ${darkMode ? "border-[var(--color-rule-menu)]" : "border-[var(--color-rule-row-2)]"}`}
            />
            <button
              type="button"
              className={`block bg-transparent py-1 text-[13px] ${darkMode ? "text-[var(--color-ink-dark)]" : "text-[var(--color-ink-menu)]"}`}
            >
              Account settings
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className={`block bg-transparent py-1 text-[13px] ${darkMode ? "text-[var(--color-ink-dark)]" : "text-[var(--color-ink-menu)]"}`}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
