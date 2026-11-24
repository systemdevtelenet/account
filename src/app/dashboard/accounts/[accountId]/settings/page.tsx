"use client";

import AccountSectionPage from "../../../../../features/accounts/AccountSectionPage";

export default function DynamicAccountSettingsPage() {
  // Keep the dynamic account settings route aligned with the shared account page.
  // AccountSectionPage reads the active route context and renders the settings section.
  return <AccountSectionPage />;
}
