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

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?message=no_code`);
  }

  try {
    // @supabase/ssr client reads code_verifier from request cookies internally
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      return NextResponse.redirect(`${origin}${next}`);
    }

  } catch {
    // Silently fall through to error redirect
  }

  return NextResponse.redirect(`${origin}/auth/error?message=exchange_failed`);
}
