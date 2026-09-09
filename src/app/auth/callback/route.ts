// ============================================================
// Auth Callback Route (T0.4)
// Handles email confirmation redirects from Supabase.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const rawNext = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const errorParam = request.nextUrl.searchParams.get("error");
  const origin = request.nextUrl.origin;

  // Only allow internal redirects — strip any absolute/external URLs
  const next = rawNext.startsWith("/") ? rawNext : "/dashboard";

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?message=no_code`);
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && data.user) {
      // Pass the authenticated client + user directly. The session
      // lives on this client instance; a fresh createClient() call
      // would not see the cookies set by exchangeCodeForSession.
      await ensureProfileForUser(supabase, data.user);

      return NextResponse.redirect(`${origin}${next}`);
    }

  } catch {
    // Silently fall through to error redirect
  }

  return NextResponse.redirect(`${origin}/auth/error?message=exchange_failed`);
}
