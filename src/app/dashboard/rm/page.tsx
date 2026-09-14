import AccountDashboardPage from "../../../features/accounts/AccountDashboardPage";

const summaryItems = [
  {
    label: "Current balance",
    value: "$12,480.00",
  },
  {
    label: "Monthly spending",
    value: "$2,140.50",
  },
  {
    label: "Active subscriptions",
    value: "8",
  },
];

export default function RocketMoneyPage() {
  return (
    <AccountDashboardPage
      shortTitle="RM"
      fullTitle="Rocket Money"
      description="A simple account overview for balances, monthly activity, and subscriptions."
      summaryItems={summaryItems}
    />
  );
}
