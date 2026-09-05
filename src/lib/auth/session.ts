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
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
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

  // If no profile row exists, try to create one (self-healing for legacy accounts)
  if (error || !data) {
        try {
      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email ?? "",
          full_name: user.user_metadata?.full_name ?? "",
          role: "partner",
        })
        .select("*")
        .single<Profile>();

      if (createError) {
            return null;
      }

      // Also create the partner profile
      const { data: ppCreated, error: ppError } = await supabase
        .from("partner_profiles")
        .insert({ user_id: user.id, brand_name: "" })
        .select("id")
        .single<{ id: string }>();

      if (ppError) {
          } else {
          }

          return created;
    } catch (e) {
          return null;
    }
  }

  return data;
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