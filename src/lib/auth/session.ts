// ============================================================
// Server-side session and profile helpers (T0.4)
// ============================================================

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/supabase/database.types";

export const getSession = cache(async () => {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, error };
  return { session: data.session, error: null };
});

export const getUser = cache(async () => {
  const { session } = await getSession();
  return session?.user ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  return data ?? null;
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