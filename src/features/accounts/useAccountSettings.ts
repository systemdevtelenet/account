"use client";

import {
  useCallback,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import {
  applySettingsPrefill,
  createDefaultAccountSettings,
  getAccountSettingsStorageKey,
  parseAccountSettings,
  type AccountSettings,
  type SettingsPrefill,
} from "./accountSettings";

export const ACCOUNT_SETTINGS_CHANGE_EVENT = "operation-system:account-settings-change";

type SaveResult = { ok: true } | { ok: false; error: string };

const SERVER_SETTINGS = createDefaultAccountSettings();
const snapshotCache = new Map<string, { raw: string | null; settings: AccountSettings }>();

function readRawSettings(storageKey: string): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function getSettingsSnapshot(storageKey: string): AccountSettings {
  const raw = readRawSettings(storageKey);
  const cached = snapshotCache.get(storageKey);
  if (cached?.raw === raw) return cached.settings;

  const settings = parseAccountSettings(raw);
  snapshotCache.set(storageKey, { raw, settings });
  return settings;
}

function getServerSettingsSnapshot(): AccountSettings {
  return SERVER_SETTINGS;
}

function subscribeToSettings(storageKey: string, onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onStoreChange();
  };
  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ACCOUNT_SETTINGS_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ACCOUNT_SETTINGS_CHANGE_EVENT, handleChange);
  };
}

/** Per-account browser preferences. No account data or credentials are sent anywhere. */
export default function useAccountSettings(accountId: string, prefill: SettingsPrefill) {
  const storageKey = getAccountSettingsStorageKey(accountId);
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToSettings(storageKey, onStoreChange),
    [storageKey],
  );
  const getSnapshot = useCallback(
    () => getSettingsSnapshot(storageKey),
    [storageKey],
  );
  const persisted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSettingsSnapshot,
  );
  const [draftState, setDraftState] = useState<{
    key: string;
    settings: AccountSettings;
  } | null>(null);

  const draft = draftState?.key === storageKey ? draftState.settings : null;
  const settings = applySettingsPrefill(draft ?? persisted, prefill);
  const loaded = persisted !== SERVER_SETTINGS;
  const isDirty = draft !== null;

  function setSettings(update: SetStateAction<AccountSettings>) {
    setDraftState((previous) => {
      const current = previous?.key === storageKey ? previous.settings : settings;
      const next = typeof update === "function" ? update(current) : update;
      return { key: storageKey, settings: next };
    });
  }

  function saveSettings(): SaveResult {
    try {
      // Once identity values are shown on the form, treat them as part of the
      // saved snapshot so clearing a field is a real choice, not a re-prefill.
      const savedSettings = prefill.loaded
        ? { ...settings, prefillApplied: true }
        : settings;
      const serialized = JSON.stringify(savedSettings);
      window.localStorage.setItem(storageKey, serialized);
      snapshotCache.set(storageKey, { raw: serialized, settings: savedSettings });
      window.dispatchEvent(new Event(ACCOUNT_SETTINGS_CHANGE_EVENT));
      setDraftState(null);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "Browser storage is unavailable; these preferences were not saved.",
      };
    }
  }

  return { settings, setSettings, loaded, isDirty, saveSettings };
}
