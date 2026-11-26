export const ACCOUNT_SETTINGS_STORAGE_PREFIX = "operation-system:account-settings:";

export const ACCENT_COLORS = [
  "var(--color-accent)",
  "var(--color-violet-bright)",
  "var(--color-positive-bright)",
  "var(--color-warning-bright)",
  "var(--color-rose-bright)",
  "var(--color-magenta)",
  "var(--color-cyan-mid)",
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];
export type ThemeChoice = "light" | "dark" | "system";

export type AccountSettings = {
  appearance: {
    theme: ThemeChoice;
    themeSelected: boolean;
    accentColor: AccentColor;
    compactMode: boolean;
    showPreviews: boolean;
    animationsEnabled: boolean;
  };
  prefillApplied: boolean;
  profile: {
    fullName: string;
    role: string;
    email: string;
  };
  notifications: {
    rosterUpdates: boolean;
    onboardingAlerts: boolean;
    separationReports: boolean;
  };
};

const DEFAULT_ACCENT_COLOR: AccentColor = "var(--color-accent)";

const DEFAULT_SETTINGS: AccountSettings = {
  appearance: {
    theme: "light",
    themeSelected: false,
    accentColor: DEFAULT_ACCENT_COLOR,
    compactMode: false,
    showPreviews: true,
    animationsEnabled: true,
  },
  prefillApplied: false,
  profile: {
    fullName: "",
    role: "",
    email: "",
  },
  notifications: {
    rosterUpdates: true,
    onboardingAlerts: true,
    separationReports: false,
  },
};

export function createDefaultAccountSettings(): AccountSettings {
  return {
    appearance: { ...DEFAULT_SETTINGS.appearance },
    prefillApplied: DEFAULT_SETTINGS.prefillApplied,
    profile: { ...DEFAULT_SETTINGS.profile },
    notifications: { ...DEFAULT_SETTINGS.notifications },
  };
}

export type SettingsPrefill = {
  loaded: boolean;
  theme: ThemeChoice;
  displayName: string;
  role: string;
  email: string;
};

/**
 * Follow the active global theme until a theme is chosen on this page, then
 * prefill empty identity fields once. Saved or edited values always win.
 */
export function applySettingsPrefill(
  settings: AccountSettings,
  prefill: SettingsPrefill,
): AccountSettings {
  const appearance = settings.appearance.themeSelected
    ? settings.appearance
    : { ...settings.appearance, theme: prefill.theme };
  const shouldFillIdentity = prefill.loaded && !settings.prefillApplied;
  const fullName = shouldFillIdentity
    ? settings.profile.fullName || readText(prefill.displayName, "", 160)
    : settings.profile.fullName;
  const role = shouldFillIdentity
    ? settings.profile.role || readText(prefill.role, "", 160)
    : settings.profile.role;
  const email = shouldFillIdentity
    ? settings.profile.email || readText(prefill.email, "", 254)
    : settings.profile.email;

  const unchanged = appearance.theme === settings.appearance.theme
    && fullName === settings.profile.fullName
    && role === settings.profile.role
    && email === settings.profile.email;

  if (unchanged) return settings;

  return {
    ...settings,
    appearance,
    profile: { ...settings.profile, fullName, role, email },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown, fallback: string, maxLength = 160): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export function getAccountSettingsStorageKey(accountId: string): string {
  // Keep the key readable while preventing unusual route params from creating
  // unexpected storage entries. Unknown or missing accounts share one workspace.
  const normalized = accountId
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);

  return `${ACCOUNT_SETTINGS_STORAGE_PREFIX}${normalized || "default"}`;
}

/** Read only the relevant keys and types from browser storage. */
export function parseAccountSettings(raw: string | null): AccountSettings {
  const defaults = createDefaultAccountSettings();
  if (!raw) return defaults;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }

  if (!isRecord(parsed)) return defaults;

  const appearance = isRecord(parsed.appearance) ? parsed.appearance : {};
  const profile = isRecord(parsed.profile) ? parsed.profile : {};
  const notifications = isRecord(parsed.notifications) ? parsed.notifications : {};

  return {
    appearance: {
      theme: readOneOf(appearance.theme, ["light", "dark", "system"] as const, defaults.appearance.theme),
      themeSelected: readBoolean(appearance.themeSelected, defaults.appearance.themeSelected),
      accentColor: readOneOf(appearance.accentColor, ACCENT_COLORS, defaults.appearance.accentColor),
      compactMode: readBoolean(appearance.compactMode, defaults.appearance.compactMode),
      showPreviews: readBoolean(appearance.showPreviews, defaults.appearance.showPreviews),
      animationsEnabled: readBoolean(appearance.animationsEnabled, defaults.appearance.animationsEnabled),
    },
    prefillApplied: readBoolean(parsed.prefillApplied, defaults.prefillApplied),
    profile: {
      fullName: readText(profile.fullName, defaults.profile.fullName),
      role: readText(profile.role, defaults.profile.role),
      email: readText(profile.email, defaults.profile.email, 254),
    },
    notifications: {
      rosterUpdates: readBoolean(notifications.rosterUpdates, defaults.notifications.rosterUpdates),
      onboardingAlerts: readBoolean(notifications.onboardingAlerts, defaults.notifications.onboardingAlerts),
      separationReports: readBoolean(notifications.separationReports, defaults.notifications.separationReports),
    },
  };
}
