import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readAvatarUrl, resolveUserAccess } from "../../../lib/auth/access";

export async function GET(request: NextRequest) {
  // Read the OAuth callback parameters and validate required environment data.
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const code = request.nextUrl.searchParams.get("code");
  if (!url || !anonKey || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  // Default redirect for successful auth flows before we finalize the destination.
  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  // Create the Supabase server client and attach cookie handling to the response.
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(cacheHeaders).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // Exchange the OAuth code for an authenticated user session.
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  // If the exchange fails or no user was returned, redirect to login with OAuth error.
  if (error || !data.user) {
    response.headers.set("Location", new URL("/login?error=oauth", request.url).toString());
    return response;
  }

  // Resolve the user's access policy and destination based on their identity.
  let access;
  try {
    access = await resolveUserAccess(
      data.user.id,
      data.user.email,
      Boolean(data.user.email_confirmed_at),
      readAvatarUrl(data.user.user_metadata),
    );
  } catch {
    // Any access lookup failure is treated as an unauthorized login attempt.
    await supabase.auth.signOut();
    response.headers.set("Location", new URL("/login?error=unauthorized", request.url).toString());
    return response;
  }

  // Prevent unauthorized users from entering the app and sign them out immediately.
  if (access.status !== "allowed") {
    await supabase.auth.signOut();
    response.headers.set("Location", new URL("/login?error=unauthorized", request.url).toString());
    return response;
  }

  // Send the user to their allowed destination once access is confirmed.
  response.headers.set("Location", new URL(access.actor.destination, request.url).toString());
  return response;
}
