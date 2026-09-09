// ============================================================
// Supabase Auth Middleware (T0.4)
// Refreshes sessions on every request and handles stale tokens
// gracefully instead of crashing with 'refresh_token_not_found'.
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set({ name, value })
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  // getUser() internally calls refreshSession() if the access token is
  // expired. If the refresh token itself is invalid or not found (e.g. the
  // user's Supabase session was revoked, or cookies crossed deployment
  // domains), we catch the error and clear stale auth cookies so the user
  // gets a clean redirect to /login instead of a 500 crash.
  const { error } = await supabase.auth.getUser();

  if (error?.code === "refresh_token_not_found" || error?.status === 400) {
    // Delete all Supabase auth cookies to prevent an infinite refresh loop
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      request.nextUrl.origin;

    const loginUrl = new URL("/login", origin);
    const cleanResponse = NextResponse.redirect(loginUrl);

    // Clear the stale sb-* auth cookies
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) {
        cleanResponse.cookies.delete(cookie.name);
      }
    });

    return cleanResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};