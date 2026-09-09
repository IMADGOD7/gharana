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

  const existing = await getProfile();
  if (existing) return existing;

  const supabase = await createServerClient();

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
    console.error("[ensureProfile] profile upsert failed:", createError);
    return null;
  }

  const { error: ppError } = await supabase
    .from("partner_profiles")
    .upsert({ user_id: user.id, brand_name: "" }, { onConflict: "user_id" })
    .select("id")
    .single<{ id: string }>();

  if (ppError) {
    console.error("[ensureProfile] partner_profiles upsert failed:", ppError);
    return null;
  }

  return created;
});

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