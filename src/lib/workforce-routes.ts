export function getAccountRoutes(accountCode: string) {
  // All accounts now use the shared dynamic route under /dashboard/accounts/[accountId].
  const accountPath = `/dashboard/accounts/${encodeURIComponent(accountCode)}`;

  return {
    overview: accountPath,
    roster: `${accountPath}/roster-list`,
  };
}
