import AccountDashboardPage from "../../../../features/accounts/AccountDashboardPage";

export default async function DynamicAccountPage({
  params,
}: {
  // Next.js provides dynamic route parameters as a promise.
  params: Promise<{ accountId: string }>;
}) {
  // Resolve the route parameters before rendering the dashboard.
  const { accountId } = await params;

  // Pass the route's account ID as the dashboard's account code.
  return <AccountDashboardPage accountCode={accountId} />;
}
