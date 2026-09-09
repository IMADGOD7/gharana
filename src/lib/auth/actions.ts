// ============================================================
// Auth Server Actions (T0.4)
// Sign up, sign in, sign out — server-side
// ============================================================

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getOrCreatePartnerProfile } from "@/lib/products/actions";

export type AuthResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

// ============================================================
// Password Reset
// ============================================================

export async function forgotPassword(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    return { ok: false, error: "Email is required" };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // redirectTo removed — triggers PKCE flow requiring same-browser code_verifier.
    // Supabase will send OTP-based token_hash links that work cross-device.
  });

  // Always return success to avoid leaking which emails are registered
  if (error) {
    // Log the error server-side for debugging, but don't expose it
    console.error("[auth] Password reset error:", error.message);
  }

  return { ok: true, message: "Check your email for a reset link" };
}

export async function resetPassword(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!password) {
    return { ok: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match" };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Password updated successfully" };
}

export async function updateBrandProfile(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const partnerProfile = await getOrCreatePartnerProfile(supabase, user.id);
  if (!partnerProfile) {
    return { ok: false, error: "Partner profile not found" };
  }

  const brand_name = String(formData.get("brand_name") || "").trim();
  const brand_tagline = String(formData.get("brand_tagline") || "").trim() || null;
  const brand_bio = String(formData.get("brand_bio") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const city = String(formData.get("city") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;
  const postal_code = String(formData.get("postal_code") || "").trim() || null;
  const website = String(formData.get("website") || "").trim() || null;

  const { error } = await supabase
    .from("partner_profiles")
    .update({
      brand_name: brand_name || undefined,
      brand_tagline,
      bio: brand_bio,
      address_line1: address,
      city,
      state,
      postal_code,
      website,
    })
    .eq("id", partnerProfile.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { ok: true, message: "Brand profile updated" };
}

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
      // emailRedirectTo removed — it triggers PKCE flow which requires a
      // code_verifier cookie from the same browser session. Without it,
      // Supabase sends OTP-based token_hash links that work cross-device.
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
      return { ok: false, error: "Invalid email or password" };
  }

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