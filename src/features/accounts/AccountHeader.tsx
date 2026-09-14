"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Bell, ChevronDown, Moon, Search, Sun } from "lucide-react";

const THEME_STORAGE_KEY = "dashboard-theme";
const THEME_CHANGE_EVENT = "dashboard-theme-change";

// The header listens to the same event as the dashboard so theme changes stay
// consistent across the shared header and page content.
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

type HeaderProps = {
  initialDarkMode?: boolean;
};

export default function AccountHeader({
  initialDarkMode = false,
}: HeaderProps) {
  const darkMode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => initialDarkMode,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleSearch = () => {
    const nextSearchState = !searchOpen;
    setSearchOpen(nextSearchState);

    if (nextSearchState) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  };

  const toggleTheme = () => {
    const nextTheme = darkMode ? "light" : "dark";
    const nextBackgroundColor = darkMode ? "#ffffff" : "#101c39";

    // Keep local storage, the cookie, and document styles in sync so the
    // selected theme survives refreshes without waiting for a server render.
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.cookie = `${THEME_STORAGE_KEY}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.style.backgroundColor = nextBackgroundColor;
    document.documentElement.style.colorScheme = nextTheme;
    document.body.style.backgroundColor = nextBackgroundColor;
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <header className="relative z-30 mb-12 flex items-center justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-[15px] sm:text-xl">
          CTNP Account Analytics Portal
        </div>
      </div>

      <div className="relative flex items-center gap-1.5 sm:gap-2.5">
        <div
          className={`flex h-9 items-center overflow-hidden rounded-full border border-white/30 bg-[#055bbe33] text-[#d9edff] transition-[width,background-color,border-color] duration-200 focus-within:border-white/70 focus-within:bg-[#055bbe61] sm:h-10 ${
            searchOpen
              ? "absolute right-0 z-[60] w-[min(210px,calc(100vw-28px))] bg-[#0b69c9] sm:static sm:w-[210px] sm:bg-[#055bbe61]"
              : "w-9 sm:w-10"
          }`}
        >
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center bg-transparent text-inherit sm:h-[38px] sm:w-[38px]"
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
            onBlur={(event) => {
              if (!event.currentTarget.value) setSearchOpen(false);
            }}
          />
        </div>

        <button
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
            className="relative grid h-10 w-10 place-items-center rounded-full bg-[#055bbe1f] transition-colors hover:bg-white/15"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Bell aria-hidden="true" size={24} />
            <span className="absolute -top-[3px] -right-[3px] h-[15px] w-[15px] rounded-full border border-[#2f92ea] bg-[#f1192c]" />
          </button>

          {notificationsOpen && (
            <div
              className={`absolute top-[46px] right-[-90px] z-50 w-[285px] rounded-[14px] p-4 shadow-[0_16px_35px_#09276132] sm:right-[-55px] ${
                darkMode
                  ? "bg-[#172746] text-[#edf4ff]"
                  : "bg-white text-[#142044]"
              }`}
            >
              <div
                className={`border-b pb-3 font-bold ${darkMode ? "border-[#2b3e61]" : "border-[#edf1f7]"}`}
              >
                Notifications
                <span className="float-right rounded-[10px] bg-[#e8f2ff] px-2 py-1 text-[11px] text-[#1673e9]">
                  3 new
                </span>
              </div>
              <div
                className={`flex gap-2.5 border-b py-[13px] ${darkMode ? "border-[#2b3e61]" : "border-[#edf1f7]"}`}
              >
                <i className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00ae70]" />
                <div>
                  <strong className="block text-xs">
                    Revenue target reached
                  </strong>
                  <small
                    className={`mt-1 block text-[11px] ${darkMode ? "text-[#aabbd5]" : "text-[#657796]"}`}
                  >
                    Your monthly revenue is up 18%.
                  </small>
                </div>
              </div>
              <div
                className={`flex gap-2.5 border-b py-[13px] ${darkMode ? "border-[#2b3e61]" : "border-[#edf1f7]"}`}
              >
                <i className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#f23c75]" />
                <div>
                  <strong className="block text-xs">
                    6 accounts need review
                  </strong>
                  <small
                    className={`mt-1 block text-[11px] ${darkMode ? "text-[#aabbd5]" : "text-[#657796]"}`}
                  >
                    Review your pending accounts.
                  </small>
                </div>
              </div>
              <button className="bg-transparent pt-[13px] text-xs font-bold text-[#0870ed]">
                View all notifications
              </button>
            </div>
          )}
        </div>

        <button
          className={`flex h-[39px] items-center gap-2 rounded-[28px] border py-1 pr-2 pl-1 font-bold transition-colors sm:h-[45px] sm:gap-[11px] sm:pr-[13px] ${
            darkMode
              ? "border-white/15 bg-[#172746] text-white"
              : "border-transparent bg-[#f5f8ff] text-[#101a39]"
          }`}
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#101a32] text-sm text-white sm:h-[37px] sm:w-[37px]">
            JD
          </span>
          <span className="hidden sm:inline">John Doe</span>
          <ChevronDown aria-hidden="true" className="ml-1 sm:ml-2" size={12} />
        </button>

        {profileOpen && (
          <div
            className={`absolute top-[53px] right-0 z-50 min-w-40 rounded-[10px] px-[18px] py-3.5 text-[13px] leading-8 shadow-[0_8px_25px_#0927612c] ${darkMode ? "bg-[#172746] text-[#edf4ff]" : "bg-white text-[#17213b]"}`}
          >
            <strong className="block leading-5">John Doe</strong>
            <small
              className={`mt-[3px] block text-[11px] leading-4 ${darkMode ? "text-[#aabbd5]" : "text-[#7182a0]"}`}
            >
              Administrator
            </small>
            <hr
              className={`my-2.5 border-0 border-t ${darkMode ? "border-[#2b3e61]" : "border-[#edf1f7]"}`}
            />
            <button
              className={`block bg-transparent py-1 text-[13px] ${darkMode ? "text-[#edf4ff]" : "text-[#17213b]"}`}
            >
              Account settings
            </button>
            <button
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
