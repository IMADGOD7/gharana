// ============================================================
// Auth Server Actions (T0.4)
// Sign up, sign in, sign out — server-side
// ============================================================

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type AuthResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function signUp(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "").trim();

  if (!email || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  if (!fullName) {
    return { ok: false, error: "Full name is required" };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, message: "Check your email to confirm your account" };
}

export async function signIn(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log("[DEBUG] signIn error:", error.message);
    return { ok: false, error: "Invalid email or password" };
  }

  console.log("[DEBUG] signIn success — auth cookies set by supabase client");
  return { ok: true, message: "Signed in" };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;

  if (!fullName) {
    return { ok: false, error: "Full name is required" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile updated" };
}