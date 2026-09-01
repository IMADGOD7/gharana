// ============================================================
// Browser Supabase Client (T0.4)
// For use in Client Components ("use client")
// Uses @supabase/ssr for proper cookie handling
// ============================================================

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/supabase/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Re-export for convenience
export type { Database };
