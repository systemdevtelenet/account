"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
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

const THEME_STORAGE_KEY = "dashboard-theme";
const THEME_CHANGE_EVENT = "dashboard-theme-change";

type AccountSection = "onboarding-offboarding" | "settings";

type AccountSectionPageProps = {
  section: AccountSection;
};

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
 * Shared shell for account sections that have their own route.
 * The sidebar and header stay consistent while the section content changes.
 */
export default function AccountSectionPage({ section }: AccountSectionPageProps) {
  const darkMode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => false,
  );
  const isSettings = section === "settings";
  const title = isSettings ? "Settings" : "Onboarding & Offboarding";
  const description = isSettings
    ? "Manage account preferences, alerts, and access controls."
    : "Track employee onboarding progress and separation activity.";
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
                  {title}
                </h1>
                <p className="mt-1 text-[11px] text-white/90">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-3 px-4 py-5 pb-24 sm:px-7 lg:pb-7">
          {isSettings ? (
            <SettingsContent
              darkMode={darkMode}
              panelClass={panelClass}
              mutedClass={mutedClass}
            />
          ) : (
            <OnboardingContent panelClass={panelClass} mutedClass={mutedClass} />
          )}
        </div>
      </div>
    </main>
  );
}

function OnboardingContent({
  panelClass,
  mutedClass,
}: {
  panelClass: string;
  mutedClass: string;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <InfoCard label="Active onboarding" value="24" icon={<UsersRound size={21} />} color="#2588e8" panelClass={panelClass} />
        <InfoCard label="Pending review" value="8" icon={<CheckCircle2 size={21} />} color="#ffb52c" panelClass={panelClass} />
        <InfoCard label="Recent offboarding" value="13" icon={<UsersRound size={21} />} color="#fa3e65" panelClass={panelClass} />
      </div>
      <section className={`rounded-xl border p-5 shadow-sm ${panelClass}`}>
        <h2 className="text-sm font-bold">Employee workflow</h2>
        <p className={`mt-1 text-[10px] ${mutedClass}`}>
          Review onboarding and offboarding activity for this account.
        </p>
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[620px] text-[11px]">
            {[
              ["Abdellah Nohreen Dsimomba", "Onboarding", "In review"],
              ["Benjamin Cuizon", "Onboarding", "Documents ready"],
              ["Francisco Martin Cayada", "Offboarding", "Completed"],
            ].map(([name, workflow, status]) => (
              <div key={name} className={`grid grid-cols-[1.5fr_1fr_1fr] border-b py-3 last:border-b-0 ${darkModeRowClass(panelClass)}`}>
                <span>{name}</span>
                <span className={mutedClass}>{workflow}</span>
                <span className="font-semibold text-[#1689e9]">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SettingsContent({
  darkMode,
  panelClass,
  mutedClass,
}: {
  darkMode: boolean;
  panelClass: string;
  mutedClass: string;
}) {
  const [activeSetting, setActiveSetting] = useState("Appearance");
  const [savedMessage, setSavedMessage] = useState("");
  const [themeChoice, setThemeChoice] = useState<"light" | "dark" | "system">(darkMode ? "dark" : "light");
  const [accentColor, setAccentColor] = useState("#1688e8");
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
    setSavedMessage(`${activeSetting} settings saved.`);
  };

  const changeTheme = (theme: "light" | "dark" | "system") => {
    const resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;

    setThemeChoice(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
    document.cookie = `${THEME_STORAGE_KEY}=${resolvedTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.style.colorScheme = resolvedTheme;
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <div
      data-animations={animationsEnabled}
      className={`flex flex-col rounded-xl border shadow-sm md:flex-row ${compactMode ? "gap-2 p-2 md:p-3" : "gap-4 p-3 md:p-4"} ${panelClass}`}
      style={{ "--settings-accent": accentColor } as React.CSSProperties}
    >
      <nav className="w-full shrink-0 md:w-56">
        <p className={`px-3 pb-2 text-[10px] font-bold uppercase tracking-wider ${mutedClass}`}>
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
              className={`flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition-colors md:w-full ${activeSetting === setting.title ? "bg-[#e8f3ff]" : `hover:bg-[#e8f3ff]/60 ${mutedClass}`}`}
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
          <p className={`mt-1 text-xs ${mutedClass}`}>
            {activeSetting === "Appearance" && "Customize how the employee analytics workspace looks."}
            {activeSetting === "Profile" && "Manage your administrator profile information."}
            {activeSetting === "Account" && "Manage this account workspace information."}
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
                {["#1688e8", "#7448e8", "#10b981", "#e5a528", "#f05261", "#e83d91", "#18bcd4"].map((color) => (
                  <button key={color} type="button" onClick={() => setAccentColor(color)} className={`h-5 w-5 rounded-full border-2 ${accentColor === color ? "border-white ring-2 ring-[#1688e9]" : "border-transparent"}`} style={{ backgroundColor: color }} aria-label={`Use ${color} accent`} />
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
          <aside className={`mt-5 rounded-lg border p-3 xl:mt-5 ${darkMode ? "border-[#2a3b5c] bg-[#0f1d36]" : "border-[#e7edf5] bg-white"}`}>
            <div className="flex items-center gap-2 text-xs font-bold"><Eye size={16} style={{ color: accentColor }} /> Live Preview</div>
            <p className={`mt-1 text-[10px] ${mutedClass}`}>This is a preview of how your themes look.</p>
            <div className="mt-4 rounded-lg border border-[#dce6f1] p-3">
              <div className="flex items-center gap-2 text-[10px] font-bold"><span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#182746]">CTNP</span> Dashboard</div>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {["Total Accounts", "Active", "Revenue"].map((label, index) => <div key={label} className="rounded bg-[#172746] p-2 text-[8px] text-white"><span className="block opacity-60">{label}</span><strong>{["24", "18", "₱2.4M"][index]}</strong></div>)}
              </div>
              <div className="mt-2 flex h-20 items-end gap-1 rounded bg-[#172746] p-3">{[20, 32, 25, 44, 36, 52, 42, 62, 38, 50].map((height, index) => <i key={index} className="flex-1 rounded-t" style={{ height: `${height}%`, backgroundColor: accentColor }} />)}</div>
            </div>
          </aside>
        )}

        {activeSetting === "Profile" && <SettingsFields fields={["Full name", "Role", "Email"]} />}
        {activeSetting === "Account" && <SettingsFields fields={["Account name", "Organization", "Timezone"]} />}
        {activeSetting === "Notifications" && <SettingsOptions options={["Roster updates", "Onboarding and offboarding alerts", "Separation analysis reports"]} />}
        {activeSetting === "Security" && <SettingsFields fields={["Current password", "New password", "Confirm new password"]} passwordFields />}
        {activeSetting === "Workforce Preferences" && <SettingsFields fields={["Default site", "Default department", "Report frequency"]} />}

        <div className="mt-6 flex items-center justify-between gap-3 xl:col-span-2">
          <span className="text-xs text-[#12a66a]">{savedMessage}</span>
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
          <input type={passwordFields ? "password" : "text"} defaultValue={passwordFields ? undefined : index === 0 ? "John Doe" : undefined} className="mt-1 w-full rounded-lg border border-[#dce6f1] bg-transparent px-3 py-2 text-sm font-normal outline-none" />
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
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#147ce5]" />
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
        className="h-4 w-4 accent-[#1688e8]"
      />
    </label>
  );
}

function InfoCard({ label, value, icon, color, panelClass }: { label: string; value: string; icon: React.ReactNode; color: string; panelClass: string }) {
  return (
    <article className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm ${panelClass}`}>
      <span className="grid h-11 w-11 place-items-center rounded-full" style={{ backgroundColor: `${color}1b`, color }}>
        {icon}
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
        <strong className="mt-1 block text-2xl">{value}</strong>
      </div>
    </article>
  );
}

function darkModeRowClass(panelClass: string) {
  return panelClass.includes("bg-[#172746]") ? "border-[#2a3b5c]" : "border-[#edf1f7]";
}
