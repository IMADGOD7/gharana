// ============================================================
// Maker Server Actions (T4)
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

type MakerRow = {
  id: string;
  product_id: string;
  name: string;
  bio: string | null;
  craft_technique: string;
  years_of_experience: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMakers(productId: string): Promise<MakerRow[]> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role !== "admin") {
    const { data: product } = await supabase
      .from("products")
      .select("partner_id")
      .eq("id", productId)
      .single<{ partner_id: string }>();

    if (!product) return [];

    const { data: partnerProfile } = await supabase
      .from("partner_profiles")
      .select("id")
      .eq("user_id", profile.id)
      .single<{ id: string }>();

    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return [];
    }
  }

  const { data } = await supabase
    .from("makers")
    .select("*")
    .eq("product_id", productId);

  return (data ?? []) as MakerRow[];
}

export async function createMaker(productId: string, formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role !== "admin") {
    const { data: product } = await supabase
      .from("products")
      .select("partner_id, status")
      .eq("id", productId)
      .single<{ partner_id: string; status: string }>();

    if (!product) {
      return { ok: false as const, error: "Product not found" };
    }

    const { data: partnerProfile } = await supabase
      .from("partner_profiles")
      .select("id")
      .eq("user_id", profile.id)
      .single<{ id: string }>();

    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return { ok: false as const, error: "Not authorized" };
    }

    if (product.status !== "draft") {
      return { ok: false as const, error: "Only draft products can be edited" };
    }
  }

  const name = String(formData.get("name") || "").trim();
  const craft_technique = String(formData.get("craft_technique") || "").trim();
  const bio = String(formData.get("bio") || "").trim() || null;
  const years_of_experience = formData.get("years_of_experience")
    ? parseInt(String(formData.get("years_of_experience")))
    : null;
  const location = String(formData.get("location") || "").trim() || null;

  if (!name || !craft_technique) {
    return { ok: false as const, error: "Name and craft technique are required" };
  }

  const { error } = await supabase.from("makers").insert({
    product_id: productId,
    name,
    craft_technique,
    bio,
    years_of_experience,
    location,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath(`/dashboard/products/${productId}/makers`);
  return { ok: true as const };
}

export async function deleteMaker(productId: string, makerId: string) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role !== "admin") {
    const { data: product } = await supabase
      .from("products")
      .select("partner_id, status")
      .eq("id", productId)
      .single<{ partner_id: string; status: string }>();

    if (!product) {
      return { ok: false as const, error: "Product not found" };
    }

    const { data: partnerProfile } = await supabase
      .from("partner_profiles")
      .select("id")
      .eq("user_id", profile.id)
      .single<{ id: string }>();

    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return { ok: false as const, error: "Not authorized" };
    }
  }

  const { error } = await supabase
    .from("makers")
    .delete()
    .eq("id", makerId)
    .eq("product_id", productId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath(`/dashboard/products/${productId}/makers`);
  return { ok: true as const };
}