// ============================================================
// Auth Callback Route (T0.4)
// Handles email confirmation redirects from Supabase.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const errorParam = request.nextUrl.searchParams.get("error");
  const origin = request.nextUrl.origin;

  console.log("[auth/callback] Request:", {
    url: request.url,
    hasCode: !!code,
    error: errorParam,
    cookies: request.cookies.getAll().map(c => c.name),
  });

  if (errorParam) {
    console.error("[auth/callback] URL error:", errorParam, request.nextUrl.searchParams.get("error_description"));
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    console.error("[auth/callback] No code found");
    return NextResponse.redirect(`${origin}/auth/error?message=no_code`);
  }

  try {
    // @supabase/ssr client reads code_verifier from request cookies internally
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[auth/callback] Exchange result:", {
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      error: error?.message,
    });

    if (!error && data.session) {
      console.log("[auth/callback] SUCCESS — redirecting to:", next);
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error?.message);

  } catch (e) {
    console.error("[auth/callback] Exception:", e);
  }

  return NextResponse.redirect(`${origin}/auth/error?message=exchange_failed`);
}
