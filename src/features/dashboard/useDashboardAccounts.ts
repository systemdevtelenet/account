"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { DashboardWorkforceSummary } from "../../lib/supabase/workforce-data";
import useLiveWorkforceResource from "../workforce/useLiveWorkforceResource";

export type Accent = "blue" | "green" | "orange" | "pink" | "purple" | "cyan";

export type AccountCard = {
  shortTitle: string;
  fullTitle: string;
  color: Accent;
  route: string;
  totalEmployees: number;
  activeEmployees: number;
};

type DashboardWorkforceData = DashboardWorkforceSummary & {
  accounts: Array<{
    accountCode: string;
    fullTitle: string;
    route: string;
    totalEmployees: number;
    activeEmployees: number;
  }>;
};

type DashboardAccounts = {
  orderedAccounts: AccountCard[];
  summary: DashboardWorkforceSummary | null;
  loading: boolean;
  error: string;
  hiddenCount: number;
  saveOrder: (accounts: AccountCard[]) => void;
  hideAccount: (accountId: string) => void;
  restoreAccounts: () => void;
};

const ACCOUNT_ORDER_STORAGE_KEY = "dashboard-account-order";
const ACCOUNT_ORDER_CHANGE_EVENT = "dashboard-account-order-change";
const HIDDEN_ACCOUNTS_STORAGE_KEY = "dashboard-hidden-accounts";
const HIDDEN_ACCOUNTS_CHANGE_EVENT = "dashboard-hidden-accounts-change";
const ACCENTS: Accent[] = ["green", "purple", "cyan", "blue", "orange", "pink"];

function subscribeToAccountPreferences(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(ACCOUNT_ORDER_CHANGE_EVENT, onChange);
  window.addEventListener(HIDDEN_ACCOUNTS_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ACCOUNT_ORDER_CHANGE_EVENT, onChange);
    window.removeEventListener(HIDDEN_ACCOUNTS_CHANGE_EVENT, onChange);
  };
}

function getAccountOrderSnapshot() {
  try {
    return window.localStorage.getItem(ACCOUNT_ORDER_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getHiddenAccountsSnapshot() {
  try {
    return window.localStorage.getItem(HIDDEN_ACCOUNTS_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerAccountPreferencesSnapshot() {
  return "[]";
}

function parseIds(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return [...new Set(parsed.filter((item): item is string => typeof item === "string"))];
  } catch {
    return [] as string[];
  }
}

function resolveAccountOrder(snapshot: string, accounts: AccountCard[]) {
  const orderedIds = parseIds(snapshot);
  if (orderedIds.length === 0) return accounts;

  const ordered = orderedIds
    .map((accountId) => accounts.find((account) => account.shortTitle === accountId))
    .filter((account): account is AccountCard => Boolean(account));
  const orderedIdsSet = new Set(ordered.map((account) => account.shortTitle));
  return [...ordered, ...accounts.filter((account) => !orderedIdsSet.has(account.shortTitle))];
}

export default function useDashboardAccounts(period: string, anchor: string): DashboardAccounts {
  const { data, loading, error } = useLiveWorkforceResource<DashboardWorkforceData>(
    `/api/dashboard/workforce?period=${encodeURIComponent(period)}&anchor=${encodeURIComponent(anchor)}`,
  );
  const accountOrderSnapshot = useSyncExternalStore(
    subscribeToAccountPreferences,
    getAccountOrderSnapshot,
    getServerAccountPreferencesSnapshot,
  );
  const hiddenAccountsSnapshot = useSyncExternalStore(
    subscribeToAccountPreferences,
    getHiddenAccountsSnapshot,
    getServerAccountPreferencesSnapshot,
  );
  const hiddenIds = useMemo(() => new Set(parseIds(hiddenAccountsSnapshot)), [hiddenAccountsSnapshot]);
  const availableAccounts = (data?.accounts ?? [])
    .filter((account) => !hiddenIds.has(account.accountCode))
    .map((account, index): AccountCard => ({
      shortTitle: account.accountCode,
      fullTitle: account.fullTitle,
      color: ACCENTS[index % ACCENTS.length],
      route: account.route,
      totalEmployees: account.totalEmployees,
      activeEmployees: account.activeEmployees,
    }));

  const persistIds = (key: string, eventName: string, ids: string[]) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // The event still refreshes mounted components when storage is blocked.
    }
    window.dispatchEvent(new Event(eventName));
  };

  const saveOrder = (nextAccounts: AccountCard[]) => {
    persistIds(ACCOUNT_ORDER_STORAGE_KEY, ACCOUNT_ORDER_CHANGE_EVENT, nextAccounts.map((account) => account.shortTitle));
  };

  const hideAccount = (accountId: string) => {
    persistIds(HIDDEN_ACCOUNTS_STORAGE_KEY, HIDDEN_ACCOUNTS_CHANGE_EVENT, [...hiddenIds, accountId]);
  };

  const restoreAccounts = () => {
    persistIds(HIDDEN_ACCOUNTS_STORAGE_KEY, HIDDEN_ACCOUNTS_CHANGE_EVENT, []);
  };

  return {
    orderedAccounts: resolveAccountOrder(accountOrderSnapshot, availableAccounts),
    summary: data ? {
      totalEmployees: data.totalEmployees,
      activeEmployees: data.activeEmployees,
      employeesOnLeave: data.employeesOnLeave,
      recordedResignations: data.recordedResignations,
      offboardingHistoryAvailable: data.offboardingHistoryAvailable,
      annualExitCount: data.annualExitCount,
      chart: data.chart,
      movements: data.movements,
      quarterlyExits: data.quarterlyExits,
      annualSeparationReasons: data.annualSeparationReasons,
    } : null,
    loading,
    error,
    hiddenCount: hiddenIds.size,
    saveOrder,
    hideAccount,
    restoreAccounts,
  };
}
