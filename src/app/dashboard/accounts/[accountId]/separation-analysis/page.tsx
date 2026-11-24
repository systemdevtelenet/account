"use client";

// Reuse the shared separation analysis screen so all account routes stay consistent.
import SeparationAnalysisPage from "../../../../../features/accounts/SeparationAnalysisPage";

// This route acts as a thin wrapper around the shared account-level separation analysis UI.
export default function AccountSeparationAnalysisRoute() {
  // Keep separation analysis consistent by mounting its shared implementation.
  return <SeparationAnalysisPage />;
}
