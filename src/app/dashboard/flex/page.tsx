import AccountDashboardPage from "../../../features/accounts/AccountDashboardPage";

const summaryItems = [
  {
    label: "Available balance",
    value: "$8,920.00",
  },
  {
    label: "Monthly activity",
    value: "$1,475.20",
  },
  {
    label: "Active plans",
    value: "4",
  },
];

export default function FlexarPage() {
  return (
    <AccountDashboardPage
      shortTitle="FLEX"
      fullTitle="Flexar"
      description="A simple flexible-account overview for balances, activity, and active plans."
      summaryItems={summaryItems}
    />
  );
}
