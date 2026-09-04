// ============================================================
// Server Supabase Client (T0.4)
// For use in Server Components, Server Actions, Route Handlers
// Uses @supabase/ssr with Next.js cookies()
// ============================================================
// Note: cookies() is read-only in Server Components but
// writable in Route Handlers and Server Actions. The
// setAll callback only fires in contexts where it's allowed.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Read-only context (Server Component) — cookies
            // will be set by the middleware or Route Handler.
          }
        },
      },
    }
  );
}
