import AccountDashboardPage from "../../../features/accounts/AccountDashboardPage";

const summaryItems = [
  {
    label: "Credit score",
    value: "742",
  },
  {
    label: "Open accounts",
    value: "6",
  },
  {
    label: "Credit utilization",
    value: "18%",
  },
];

export default function BfExperianPage() {
  return (
    <AccountDashboardPage
      shortTitle="BF"
      fullTitle="BF Experian"
      description="A simple credit overview for account health, utilization, and monitoring."
      summaryItems={summaryItems}
    />
  );
}
