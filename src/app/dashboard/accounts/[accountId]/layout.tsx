import type { ReactNode } from "react";
import { requireAccountAccess } from "../../../../lib/auth/access";

export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ accountId: string }>;
}) {
  // Next.js provides route parameters asynchronously in this layout.
  const { accountId } = await params;
  // Apply the access check here so it covers this page and all nested routes.
  await requireAccountAccess(accountId);
  // Render the protected account content only after access is confirmed.
  return children;
}
