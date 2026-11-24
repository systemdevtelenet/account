import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  // Revoke the current user's Supabase session.
  const { error } = await supabase.auth.signOut();
  if (error) return Response.json({ error: "Could not sign out." }, { status: 500 });
  // Prevent clients or intermediaries from caching the logout result.
  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
