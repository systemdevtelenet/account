"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CircleUserRound,
  Eye,
  LockKeyhole,
  Monitor,
  Moon,
  Palette,
  UsersRound,
  Sun,
} from "lucide-react";
import AccountSidebar from "../../components/AccountSidebar";
import AccountHeader from "./AccountHeader";
import useAccountSidebar from "./useAccountSidebar";
import useDashboardTheme, {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "../dashboard/useDashboardTheme";

/** Shared shell for account settings routes. */
export default function AccountSectionPage() {
  const darkMode = useDashboardTheme();
  const sidebar = useAccountSidebar();
  const title = "Settings";
  const description = "Manage account preferences, alerts, and access controls.";
  const mutedClass = darkMode ? "text-[#9aacc5]" : "text-[#687993]";

  return (
    <main
      data-account-theme={darkMode ? "dark" : "light"}
      data-sidebar-collapsed={sidebar.collapsed}
      data-sidebar-open={sidebar.mobileOpen}
      className={`account-screen min-h-screen ${darkMode ? "bg-[#101c39]" : "bg-[#f5f8fc]"}`}
    >
      <AccountSidebar
        darkMode={darkMode}
        collapsed={sidebar.collapsed}
        mobileOpen={sidebar.mobileOpen}
        onClose={sidebar.closeMobile}
      />
      <div className="lg:pl-[220px]">
        <section
          className={`account-hero relative px-4 pt-4 pb-8 text-white sm:px-7 ${
            darkMode
              ? "bg-[linear-gradient(119deg,#234d73,#2F6798)]"
              : "bg-[linear-gradient(119deg,#2F6798,#5F8DB5)]"
          }`}
        >
          <div className="relative z-10">
            <AccountHeader
              initialDarkMode={darkMode}
              onMenuClick={sidebar.toggle}
              menuExpanded={sidebar.expanded}
            />
            <div className="account-page-heading mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[27px] font-semibold leading-tight sm:text-[32px]">
                  {title}
                </h1>
                <p className="mt-2 max-w-[60ch] text-sm leading-6 text-white/85">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="account-content space-y-5 px-4 py-5 pb-24 sm:px-7 lg:pb-8">
          <SettingsContent darkMode={darkMode} mutedClass={mutedClass} />
        </div>
      </div>
    </main>
  );
}

function SettingsContent({
  darkMode,
  mutedClass,
}: {
  darkMode: boolean;
  mutedClass: string;
}) {
  const [activeSetting, setActiveSetting] = useState("Appearance");
  const [savedMessage, setSavedMessage] = useState("");
  const [themeChoice, setThemeChoice] = useState<"light" | "dark" | "system">(darkMode ? "dark" : "light");
  const [appliedTheme, setAppliedTheme] = useState<"light" | "dark" | null>(null);
  const [accentColor, setAccentColor] = useState("#2F6798");
  const [compactMode, setCompactMode] = useState(false);
  const [showPreviews, setShowPreviews] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const settings = [
    { title: "Appearance", icon: <Palette size={18} /> },
    { title: "Profile", icon: <CircleUserRound size={18} /> },
    { title: "Account", icon: <Building2 size={18} /> },
    { title: "Notifications", icon: <Bell size={18} /> },
    { title: "Security", icon: <LockKeyhole size={18} /> },
    { title: "Workforce Preferences", icon: <UsersRound size={18} /> },
  ];

  const saveSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Other settings remain local preview state; only theme choice is persisted below.
    setSavedMessage(`${activeSetting} settings saved.`);
  };

  // Apply theme side effects after render instead of mutating browser globals
  // from the click handler. The null state keeps the initial render untouched.
  useEffect(() => {
    if (!appliedTheme) return;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, appliedTheme);
    } catch {
      // Storage can be blocked; the cookie and event still apply the choice.
    }
    document.cookie = `${THEME_STORAGE_KEY}=${appliedTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.dataset.theme = appliedTheme;
    document.documentElement.style.colorScheme = appliedTheme;
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, [appliedTheme]);

  const changeTheme = (theme: "light" | "dark" | "system") => {
    // Resolve the system option once, then share the selected value across app surfaces.
    const resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;

    setThemeChoice(theme);
    setAppliedTheme(resolvedTheme);
  };

  return (
    <div
      data-animations={animationsEnabled}
      className={`account-settings-layout flex flex-col md:flex-row ${compactMode ? "gap-2" : "gap-4"}`}
      style={{ "--settings-accent": accentColor } as React.CSSProperties}
    >
      <nav className="w-full shrink-0 md:w-56">
        <p className={`px-3 pb-2 text-xs font-semibold ${mutedClass}`}>
          Settings
        </p>
        <div className="flex gap-1 overflow-x-auto md:block md:space-y-1">
          {settings.map((setting) => (
            <button
              key={setting.title}
              type="button"
              onClick={() => {
                setActiveSetting(setting.title);
                setSavedMessage("");
              }}
              aria-pressed={activeSetting === setting.title}
              className={`flex min-w-max min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors md:w-full ${activeSetting === setting.title ? "bg-[#e8f0f6]" : `hover:bg-[#e8f0f6]/60 ${mutedClass}`}`}
              style={activeSetting === setting.title ? { color: accentColor, backgroundColor: `${accentColor}22` } : undefined}
            >
              {setting.icon}
              {setting.title}
            </button>
          ))}
        </div>
      </nav>

      <form onSubmit={saveSettings} className={`min-w-0 flex-1 rounded-lg border sm:p-6 xl:grid xl:grid-cols-[minmax(0,1fr)_280px] ${compactMode ? "gap-3 p-3" : "gap-4 p-4"} ${darkMode ? "border-[#2a3b5c] bg-[#132442]" : "border-[#e7edf5] bg-[#fbfdff]"}`}>
        <div className="border-b border-inherit pb-4 xl:col-span-2">
          <h2 className="text-base font-bold">{activeSetting}</h2>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            {activeSetting === "Appearance" && "Customize how the Operations and Attrition dashboard looks."}
            {activeSetting === "Profile" && "Manage your administrator profile information."}
            {activeSetting === "Account" && "Manage this account's Operations and Attrition information."}
            {activeSetting === "Notifications" && "Choose which workforce events should notify you."}
            {activeSetting === "Security" && "Protect your account and manage sign-in security."}
            {activeSetting === "Workforce Preferences" && "Set defaults for roster and workforce reporting."}
          </p>
        </div>

        {activeSetting === "Appearance" && (
          <div className="mt-5 space-y-6">
            <div>
              <h3 className="text-xs font-bold">Color Theme</h3>
              <p className={`mt-1 text-[10px] ${mutedClass}`}>Choose the theme that works best for you.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  { name: "Light", value: "light", icon: <Sun size={16} /> },
                  { name: "Dark", value: "dark", icon: <Moon size={16} /> },
                  { name: "System", value: "system", icon: <Monitor size={16} /> },
                ].map((theme) => (
                  <button key={theme.value} type="button" onClick={() => changeTheme(theme.value as "light" | "dark" | "system")} className="rounded-lg border p-3 text-left text-xs font-semibold" style={themeChoice === theme.value ? { borderColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}33` } : undefined}>
                    <span className="flex items-center gap-2">{theme.icon}{theme.name}</span>
                    <span className={`mt-3 block h-12 rounded ${theme.value === "dark" ? "bg-[#101c39]" : theme.value === "light" ? "bg-[#f5f8fc]" : "bg-gradient-to-r from-[#f5f8fc] to-[#101c39]"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold">Accent Color</h3>
              <p className={`mt-1 text-[10px] ${mutedClass}`}>Choose your preferred accent color.</p>
              <div className="mt-3 flex gap-3">
                {["#2F6798", "#7448e8", "#10b981", "#e5a528", "#f05261", "#e83d91", "#18bcd4"].map((color) => (
                  <button key={color} type="button" onClick={() => setAccentColor(color)} className={`h-5 w-5 rounded-full border-2 ${accentColor === color ? "border-white ring-2 ring-[#2F6798]" : "border-transparent"}`} style={{ backgroundColor: color }} aria-label={`Use ${color} accent`} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold">Display Options</h3>
              <p className={`mt-1 text-[10px] ${mutedClass}`}>Customize interface elements and layout.</p>
              <div className="mt-3 divide-y rounded-lg border border-[#dce6f1]">
                <SettingToggle label="Compact mode" description="Reduce spacing for more content on screen." enabled={compactMode} onChange={setCompactMode} />
                <SettingToggle label="Show data previews" description="Display quick previews in tables and cards." enabled={showPreviews} onChange={setShowPreviews} />
                <SettingToggle label="Enable animations" description="Smooth transitions and micro-interactions." enabled={animationsEnabled} onChange={setAnimationsEnabled} />
              </div>
            </div>
          </div>
        )}

        {activeSetting === "Appearance" && showPreviews && (
          <aside className="account-preview mt-5 p-3 xl:mt-5">
            <div className="flex items-center gap-2 text-xs font-bold"><Eye size={16} style={{ color: accentColor }} /> Live Preview</div>
            <p className={`mt-1 text-[10px] ${mutedClass}`}>This is a preview of how your themes look.</p>
            <nav aria-label="Operations and attrition preview" className={`mt-4 divide-y rounded-lg border px-3 ${darkMode ? "border-[#2a3b5c]" : "border-[#dce6f1]"}`}>
              {[["Core staffing", "Overview"], ["Employee roster", "Roster"], ["Separation trends", "Analysis"]].map(([label, section]) => (
                <div key={section} className="flex min-h-11 items-center justify-between gap-3 py-2 text-xs">
                  <span className="font-medium">{label}</span>
                  <span className={mutedClass}>{section}</span>
                </div>
              ))}
            </nav>
          </aside>
        )}

        {activeSetting === "Profile" && <SettingsFields fields={["Full name", "Role", "Email"]} />}
        {activeSetting === "Account" && <SettingsFields fields={["Account name", "Organization", "Timezone"]} />}
        {activeSetting === "Notifications" && <SettingsOptions options={["Roster updates", "Onboarding and offboarding alerts", "Separation analysis reports"]} />}
        {activeSetting === "Security" && <SettingsFields fields={["Current password", "New password", "Confirm new password"]} passwordFields />}
        {activeSetting === "Workforce Preferences" && <SettingsFields fields={["Default site", "Default department", "Report frequency"]} />}

        <div className="mt-6 flex items-center justify-between gap-3 xl:col-span-2">
          <span role="status" aria-live="polite" className="text-sm text-[#12a66a]">{savedMessage}</span>
          <button type="submit" className="rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: accentColor }}>Save Changes</button>
        </div>
        <style>{`[data-animations="false"] * { transition: none !important; animation: none !important; }`}</style>
      </form>
    </div>
  );
}

function SettingsFields({ fields, passwordFields = false }: { fields: string[]; passwordFields?: boolean }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {fields.map((field, index) => (
        <label key={field} className={`text-xs font-semibold ${index === 0 && fields.length === 3 ? "sm:col-span-2" : ""}`}>
          {field}
          <input type={passwordFields ? "password" : "text"} className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#2F6798]" />
        </label>
      ))}
    </div>
  );
}

function SettingsOptions({ options }: { options: string[] }) {
  return (
    <div className="mt-5 space-y-3">
      {options.map((option) => (
        <label key={option} className="flex items-center justify-between rounded-lg border border-[#dce6f1] px-3 py-3 text-xs font-semibold">
          {option}
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#2F6798]" />
        </label>
      ))}
    </div>
  );
}

function SettingToggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5">
      <span>
        <span className="block text-[10px] font-semibold">{label}</span>
        <span className="mt-0.5 block text-[9px] text-[#687993]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#2F6798]"
      />
    </label>
  );
}
