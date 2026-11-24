"use client";

// Import the shared roster page component used by account-specific routes.
import RosterListPage from "../../../../../features/accounts/RosterListPage";

// This route renders the account roster view while keeping the shared behavior centralized.
export default function DynamicAccountRosterListRoute() {
  // Reuse the shared roster behavior for this account route.
  return <RosterListPage />;
}
