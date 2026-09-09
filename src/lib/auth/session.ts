// ============================================================
// Server-side session and profile helpers (T0.4)
// ============================================================

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Inline profile type to avoid coupling to generated types file
interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "partner" | "admin";
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export const getSession = cache(async () => {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, error };
  return { session: data.session, error: null };
});

export const getUser = cache(async () => {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && !(error as unknown as { __isAuthError?: boolean }).__isAuthError) {
    console.error("[getUser] auth.getUser() failed:", error);
  }
  return data.user ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) {
      return null;
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error && error.code !== "PGRST116") {
    console.error("[getProfile] profile lookup failed:", error);
  }
  return data ?? null;
});

export const ensureProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  return ensureProfileForUser(supabase, user);
});

/**
 * Ensure profile rows exist for a known user object.
 * Used by the auth callback where the session was just established
 * but request cookies don't yet carry the new auth tokens.
 */
export async function ensureProfileForUser(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string | null } }
): Promise<Profile | null> {
  const existing = await getProfileForUser(supabase, user.id);
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? "",
        role: "partner",
      },
      { onConflict: "id" }
    )
    .select("*")
    .single<Profile>();

  if (createError || !created) {
    console.error("[ensureProfileForUser] profile upsert failed:", createError);
    return null;
  }

  const { error: ppError } = await supabase
    .from("partner_profiles")
    .upsert({ user_id: user.id, brand_name: "" }, { onConflict: "user_id" })
    .select("id")
    .single<{ id: string }>();

  if (ppError) {
    console.error("[ensureProfileForUser] partner_profiles upsert failed:", ppError);
    return null;
  }

  return created;
}

async function getProfileForUser(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (error && error.code !== "PGRST116") {
    console.error("[getProfileForUser] profile lookup failed:", error);
  }
  return data ?? null;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  return profile;
}

export async function requirePartner() {
  const profile = await getProfile();
  if (!profile || profile.role !== "partner") redirect("/");
  return profile;
}

export async function getPartnerProfileForUser(userId: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("partner_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return data ?? null;
}