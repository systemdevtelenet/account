"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bell,
  CircleUserRound,
  Eye,
  Monitor,
  Moon,
  Palette,
  Sun,
} from "lucide-react";
import AccountSidebar from "../../components/AccountSidebar";
import AccountHeader from "./AccountHeader";
import useAccountSidebar from "./useAccountSidebar";
import useCurrentRole from "../auth/useCurrentRole";
import useAccountSettings from "./useAccountSettings";
import { ACCENT_COLORS, type AccountSettings } from "./accountSettings";
import useDashboardTheme, {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "../dashboard/useDashboardTheme";

type ThemeChoice = AccountSettings["appearance"]["theme"];
type Feedback = { text: string; tone: "success" | "error" };

type TextField = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
};

type NotificationOption = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Shared shell for account settings routes. */
export default function AccountSectionPage() {
  const darkMode = useDashboardTheme();
  const sidebar = useAccountSidebar();
  const title = "Settings";
  const description = "Manage account preferences, alerts, and access controls.";
  const mutedClass = darkMode ? "text-[var(--color-muted-dark-soft)]" : "text-[var(--color-muted-2)]";

  return (
    <main
      data-account-theme={darkMode ? "dark" : "light"}
      data-sidebar-collapsed={sidebar.collapsed}
      data-sidebar-open={sidebar.mobileOpen}
      className={`account-screen min-h-screen ${darkMode ? "bg-[var(--color-night)]" : "bg-[var(--color-paper)]"}`}
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
              ? "bg-[linear-gradient(119deg,var(--color-hero-start),var(--color-accent))]"
              : "bg-[linear-gradient(119deg,var(--color-accent),var(--color-blue-muted))]"
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
  const params = useParams<{ accountId?: string | string[] }>();
  const routeAccountId = Array.isArray(params.accountId)
    ? params.accountId[0]
    : params.accountId;
  const accountId = routeAccountId || "default";
  const identity = useCurrentRole();
  const settingsPrefill = {
    loaded: identity.loaded,
    theme: darkMode ? ("dark" as const) : ("light" as const),
    displayName: identity.displayName,
    role: identity.roleLabel,
    email: identity.email,
  };
  const {
    settings,
    setSettings,
    loaded,
    isDirty,
    saveSettings: saveBrowserSettings,
  } = useAccountSettings(accountId, settingsPrefill);

  const [activeSetting, setActiveSetting] = useState("Appearance");
  const [feedback, setFeedback] = useState<Feedback>({ text: "", tone: "success" });
  const { appearance, profile, notifications } = settings;

  const settingsNav = [
    { title: "Appearance", icon: <Palette size={18} /> },
    { title: "Profile", icon: <CircleUserRound size={18} /> },
    { title: "Notifications", icon: <Bell size={18} /> },
  ];
  const statusText = feedback.text
    || (!loaded ? "Loading preferences…" : isDirty ? "Unsaved changes" : "Preferences are saved in this browser.");
  const statusClass = feedback.text
    ? (feedback.tone === "error" ? "text-[var(--color-danger-bright)]" : "text-[var(--color-positive-mid)]")
    : mutedClass;

  function showFeedback(text: string, tone: Feedback["tone"] = "success") {
    setFeedback({ text, tone });
  }

  function updateAppearance(patch: Partial<AccountSettings["appearance"]>) {
    setSettings((previous) => ({
      ...previous,
      appearance: { ...previous.appearance, ...patch },
    }));
  }

  function updateProfile(patch: Partial<AccountSettings["profile"]>) {
    setSettings((previous) => ({
      ...previous,
      profile: { ...previous.profile, ...patch },
    }));
  }

  function updateNotifications(patch: Partial<AccountSettings["notifications"]>) {
    setSettings((previous) => ({
      ...previous,
      notifications: { ...previous.notifications, ...patch },
    }));
  }

  // Apply the selected theme after render, and keep "System" in sync with the
  // operating system instead of resolving it once at click time.
  useEffect(() => {
    if (!loaded) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const chosenTheme = appearance.theme;
    const applyTheme = () => {
      const resolved: "light" | "dark" = chosenTheme === "system"
        ? (media.matches ? "dark" : "light")
        : chosenTheme;

      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, resolved);
      } catch {
        // Storage can be blocked; the cookie and event still apply the choice.
      }
      document.cookie = `${THEME_STORAGE_KEY}=${resolved}; Path=/; Max-Age=31536000; SameSite=Lax`;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    };

    applyTheme();

    if (chosenTheme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [appearance.theme, loaded]);

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loaded) {
      showFeedback("Preferences are still loading. Try again in a moment.", "error");
      return;
    }

    if (activeSetting === "Profile" && profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      showFeedback("Enter a valid email address before saving.", "error");
      return;
    }

    const result = saveBrowserSettings();
    if (!result.ok) {
      showFeedback(result.error, "error");
      return;
    }

    showFeedback(`${activeSetting} settings saved.`);
  }

  return (
    <div
      data-animations={appearance.animationsEnabled}
      className={`account-settings-layout flex flex-col md:flex-row ${appearance.compactMode ? "gap-2" : "gap-4"}`}
      style={{ "--settings-accent": appearance.accentColor } as React.CSSProperties}
    >
      <nav className="w-full shrink-0 md:w-56">
        <p className={`px-3 pb-2 text-xs font-semibold ${mutedClass}`}>
          Settings
        </p>
        <div className="flex gap-1 overflow-x-auto md:block md:space-y-1">
          {settingsNav.map((setting) => (
            <button
              key={setting.title}
              type="button"
              onClick={() => {
                setActiveSetting(setting.title);
                showFeedback("");
              }}
              aria-pressed={activeSetting === setting.title}
              className={`settings-nav-button flex min-w-max min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors md:w-full ${activeSetting === setting.title ? "bg-[var(--color-status-well)]" : `hover:bg-[var(--color-status-well)]/60 ${mutedClass}`}`}
              style={activeSetting === setting.title ? { color: appearance.accentColor } : undefined}
            >
              {setting.icon}
              {setting.title}
            </button>
          ))}
        </div>
      </nav>

      <form onSubmit={saveSettings} className={`min-w-0 flex-1 rounded-lg border sm:p-6 xl:grid xl:grid-cols-[minmax(0,1fr)_280px] ${appearance.compactMode ? "gap-3 p-3" : "gap-4 p-4"} ${darkMode ? "border-[var(--color-rule-dark)] bg-[var(--color-night-panel)]" : "border-[var(--color-rule-card)] bg-[var(--color-status-well-bright)]"}`}>
        <div className="border-b border-inherit pb-4 xl:col-span-2">
          <h2 className="text-base font-bold">{activeSetting}</h2>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            {activeSetting === "Appearance" && "Customize how the Operations and Attrition dashboard looks."}
            {activeSetting === "Profile" && "Manage your administrator profile information."}
            {activeSetting === "Notifications" && "Choose which workforce events should notify you."}
          </p>
        </div>

        {activeSetting === "Appearance" && (
          <div className="mt-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold">Color Theme</h3>
              <p className={`mt-1 text-xs ${mutedClass}`}>Choose the theme that works best for you.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  { name: "Light", value: "light" as const, icon: <Sun size={16} /> },
                  { name: "Dark", value: "dark" as const, icon: <Moon size={16} /> },
                  { name: "System", value: "system" as const, icon: <Monitor size={16} /> },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => updateAppearance({ theme: theme.value as ThemeChoice, themeSelected: true })}
                    aria-pressed={appearance.theme === theme.value}
                    className="settings-theme rounded-lg border p-3 text-left text-xs font-semibold"
                    style={appearance.theme === theme.value ? { borderColor: appearance.accentColor, outline: `2px solid ${appearance.accentColor}` } : undefined}
                  >
                    <span className="flex items-center gap-2">{theme.icon}{theme.name}</span>
                    <span className={`mt-3 block h-12 rounded ${theme.value === "dark" ? "bg-[var(--color-night)]" : theme.value === "light" ? "bg-[var(--color-paper)]" : "bg-gradient-to-r from-[var(--color-paper)] to-[var(--color-night)]"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold">Accent Color</h3>
              <p className={`mt-1 text-xs ${mutedClass}`}>Choose your preferred accent color.</p>
              <div className="mt-3 flex gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateAppearance({ accentColor: color })}
                    className={`settings-swatch h-6 w-6 rounded-full border-2 ${appearance.accentColor === color ? "border-white ring-2 ring-[var(--color-accent)]" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Use ${color} accent`}
                    aria-pressed={appearance.accentColor === color}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold">Display Options</h3>
              <p className={`mt-1 text-xs ${mutedClass}`}>Customize interface elements and layout.</p>
              <div className="mt-3 divide-y rounded-lg border border-[var(--color-rule-soft)]">
                <SettingToggle label="Compact mode" description="Reduce spacing for more content on screen." enabled={appearance.compactMode} onChange={(compactMode) => updateAppearance({ compactMode })} />
                <SettingToggle label="Show data previews" description="Display quick previews in tables and cards." enabled={appearance.showPreviews} onChange={(showPreviews) => updateAppearance({ showPreviews })} />
                <SettingToggle label="Enable animations" description="Smooth transitions and micro-interactions." enabled={appearance.animationsEnabled} onChange={(animationsEnabled) => updateAppearance({ animationsEnabled })} />
              </div>
            </div>
          </div>
        )}

        {activeSetting === "Appearance" && appearance.showPreviews && (
          <aside className="account-preview mt-5 p-3 xl:mt-5">
            <div className="flex items-center gap-2 text-xs font-bold"><Eye size={16} style={{ color: appearance.accentColor }} /> Live Preview</div>
            <p className={`mt-1 text-xs ${mutedClass}`}>This is a preview of how your themes look.</p>
            <nav aria-label="Operations and attrition preview" className={`mt-4 divide-y rounded-lg border px-3 ${darkMode ? "border-[var(--color-rule-dark)]" : "border-[var(--color-rule-soft)]"}`}>
              {[["Core staffing", "Overview"], ["Employee roster", "Roster"], ["Separation trends", "Analysis"]].map(([label, section]) => (
                <div key={section} className="flex min-h-11 items-center justify-between gap-3 py-2 text-xs">
                  <span className="font-medium">{label}</span>
                  <span className={mutedClass}>{section}</span>
                </div>
              ))}
            </nav>
          </aside>
        )}

        {activeSetting === "Profile" && (
          <SettingsFields fields={[
            { label: "Full name", value: profile.fullName, onChange: (fullName) => updateProfile({ fullName }) },
            { label: "Role", value: profile.role, onChange: (role) => updateProfile({ role }) },
            { label: "Email", type: "email", value: profile.email, onChange: (email) => updateProfile({ email }) },
          ]} />
        )}

        {activeSetting === "Notifications" && (
          <SettingsOptions options={[
            { label: "Roster updates", checked: notifications.rosterUpdates, onChange: (rosterUpdates) => updateNotifications({ rosterUpdates }) },
            { label: "Onboarding and offboarding alerts", checked: notifications.onboardingAlerts, onChange: (onboardingAlerts) => updateNotifications({ onboardingAlerts }) },
            { label: "Separation analysis reports", checked: notifications.separationReports, onChange: (separationReports) => updateNotifications({ separationReports }) },
          ]} />
        )}

        <div className="settings-actions mt-6 flex items-center justify-between gap-3 xl:col-span-2">
          <span
            role="status"
            aria-live="polite"
            className={`text-sm ${statusClass}`}
          >
            {statusText}
          </span>
          <button
            type="submit"
            disabled={!isDirty}
            className="settings-save rounded-lg px-4 py-2 text-xs font-bold text-white"
            style={{ backgroundColor: appearance.accentColor }}
          >
            Save Changes
          </button>
        </div>
        <style>{`[data-animations="false"] * { transition: none !important; animation: none !important; }`}</style>
      </form>
    </div>
  );
}

const inputClass = "mt-1 w-full rounded-lg border border-[var(--color-rule-soft)] bg-transparent px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

function SettingsFields({ fields }: { fields: TextField[] }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {fields.map((field, index) => (
        <label key={field.label} className={`text-sm font-semibold ${index === 0 && fields.length === 3 ? "sm:col-span-2" : ""}`}>
          {field.label}
          <input
            type={field.type ?? "text"}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            className={inputClass}
          />
        </label>
      ))}
    </div>
  );
}

function SettingsOptions({ options }: { options: NotificationOption[] }) {
  return (
    <div className="mt-5 space-y-3">
      {options.map((option) => (
        <label key={option.label} className="settings-option flex items-center justify-between rounded-lg border border-[var(--color-rule-soft)] px-3 py-3 text-sm font-semibold">
          {option.label}
          <input
            type="checkbox"
            checked={option.checked}
            onChange={(event) => option.onChange(event.target.checked)}
            className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
          />
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
    <label className="settings-toggle flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5">
      <span>
        <span className="block text-xs font-semibold">{label}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--color-muted-2)]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
      />
    </label>
  );
}
