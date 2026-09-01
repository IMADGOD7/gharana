// ============================================================
// Product Story Server Actions (T4)
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

export async function getProductStory(productId: string) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role !== "admin") {
    const { data: product } = await supabase
      .from("products")
      .select("partner_id")
      .eq("id", productId)
      .single<{ partner_id: string }>();

    if (!product) return null;

    const { data: partnerProfile } = await supabase
      .from("partner_profiles")
      .select("id")
      .eq("user_id", profile.id)
      .single<{ id: string }>();

    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return null;
    }
  }

  const { data } = await supabase
    .from("product_stories")
    .select("*")
    .eq("product_id", productId)
    .single();

  return data ?? null;
}

export async function upsertProductStory(productId: string, formData: FormData) {
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

  const inspiration = String(formData.get("inspiration") || "").trim();
  const crafting_process = String(formData.get("crafting_process") || "").trim();
  const cultural_context = String(formData.get("cultural_context") || "").trim() || null;

  const { data: existing } = await supabase
    .from("product_stories")
    .select("id")
    .eq("product_id", productId)
    .single<{ id: string }>();

  if (existing) {
    const { error } = await supabase
      .from("product_stories")
      .update({ inspiration, crafting_process, cultural_context })
      .eq("product_id", productId);

    if (error) {
      return { ok: false as const, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("product_stories")
      .insert({ product_id: productId, inspiration, crafting_process, cultural_context });

    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath(`/dashboard/products/${productId}/story`);
  return { ok: true as const };
}