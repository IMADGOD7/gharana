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
  console.log("[DEBUG] getUser result:", user ? { id: user.id, email: user.email } : null);
  return user ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) {
    console.log("[DEBUG] getProfile: no user from getUser()");
    return null;
  }
  console.log("[DEBUG] getProfile: user found, querying profiles table for id:", user.id);
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  console.log("[DEBUG] getProfile: query result:", data, "error:", error);
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