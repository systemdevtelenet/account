import { redirect } from "next/navigation";
import LoginPage from "../../features/auth/LoginPage";
import { getCurrentAccess } from "../../lib/auth/access";

export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Resolve the URL error and access status concurrently before deciding what
  // the visitor should see.
  const [params, access] = await Promise.all([searchParams, getCurrentAccess()]);
  // Users who already have a dashboard role should continue to their dashboard.
  if (access.status === "allowed") redirect(access.actor.destination);

  // An access denial is more actionable than an OAuth error, so show it first.
  const initialError = access.status === "denied" || params.error === "unauthorized"
    ? "Your account does not have a dashboard role assigned. Contact your administrator."
    : params.error === "oauth"
      ? "Google sign in could not be completed. Please try again."
      : "";

  // Provide the login form with its public Supabase settings and any error text.
  return (
    <LoginPage
      supabaseUrl={process.env.SUPABASE_URL ?? ""}
      anonKey={process.env.SUPABASE_ANON_KEY ?? ""}
      initialError={initialError}
    />
  );
}
