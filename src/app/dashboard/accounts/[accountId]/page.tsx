"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AccountDashboardPage from "../../../../features/accounts/AccountDashboardPage";

type StoredAccount = {
  shortTitle: string;
  fullTitle: string;
  description: string;
  route: string;
  color: string;
};

const CUSTOM_ACCOUNTS_STORAGE_KEY = "dashboard-custom-accounts";

// Dynamic accounts are currently client-created, so their definitions are
// loaded from local storage when this route mounts.
export default function DynamicAccountPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<StoredAccount | null>(null);

  useEffect(() => {
    const savedAccounts = window.localStorage.getItem(
      CUSTOM_ACCOUNTS_STORAGE_KEY,
    );

    if (!savedAccounts) return;

    try {
      const accounts = JSON.parse(savedAccounts) as StoredAccount[];
      setAccount(
        accounts.find((candidate) =>
          candidate.route.endsWith(`/${accountId}`),
        ) ?? null,
      );
    } catch {
      setAccount(null);
    }
  }, [accountId]);

  if (!account) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">
        Account not found.
      </main>
    );
  }

  return (
    <AccountDashboardPage
      shortTitle={account.shortTitle}
      fullTitle={account.fullTitle}
      description={account.description}
      summaryItems={[
        { label: "Active roster", value: "0" },
        { label: "Monthly activity", value: "0" },
        { label: "Active subscriptions", value: "0" },
      ]}
    />
  );
}
