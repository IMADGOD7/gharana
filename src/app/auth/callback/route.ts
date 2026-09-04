// ============================================================
// Auth Callback Route (T0.4)
// Handles email confirmation redirects from Supabase.
//
// IMPORTANT: The @supabase/ssr middleware reads cookies via
// getAll() and expects sb-access-token to contain a JSON
// string of the full session object — not just the raw token.
// We must store the structured session data so the middleware
// can parse and refresh it on subsequent requests.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam = searchParams.get("error");

  console.log("[auth/callback] Hit:", { hasCode: !!code, hasError: !!errorParam, url: request.url });

  if (errorParam) {
    console.error("[auth/callback] Error in URL:", errorParam, searchParams.get("error_description"));
    return NextResponse.redirect(
      `${origin}/auth/error?message=auth_callback_failed&detail=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    console.error("[auth/callback] No code parameter");
    return NextResponse.redirect(`${origin}/auth/error?message=auth_callback_failed`);
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[auth/callback] Exchange result:", {
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      error: error?.message,
    });

    if (!error && data.session) {
      const response = NextResponse.redirect(`${origin}${next}`);

      // Store full session object as JSON — @supabase/ssr middleware
      // expects this format to parse and refresh the session
      const sessionPayload = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (data.session.expires_in || 3600),
        token_type: data.session.token_type || "bearer",
        expires_in: data.session.expires_in || 3600,
      };

      const cookieValue = JSON.stringify(sessionPayload);

      response.cookies.set("sb-access-token", cookieValue, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: data.session.expires_in || 3600,
      });

      console.log("[auth/callback] Session cookie set, redirecting to:", next);
      return response;
    }

    console.error("[auth/callback] exchangeCodeForSession failed:", JSON.stringify({
      message: error?.message,
      status: error?.status,
      name: error?.name,
    }));
  } catch (e) {
    console.error("[auth/callback] Exception:", e);
  }

  return NextResponse.redirect(`${origin}/auth/error?message=auth_callback_failed`);
}
