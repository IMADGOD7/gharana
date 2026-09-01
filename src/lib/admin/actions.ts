// ============================================================
// Admin Server Actions (T5)
// Admin review/approve/reject products
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";

export async function reviewProduct(
  productId: string,
  decision: "approve" | "reject" | "request_changes",
  notes: string
) {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("status")
    .eq("id", productId)
    .single<{ status: string }>();

  if (!product) {
    return { ok: false as const, error: "Product not found" };
  }

  if (product.status !== "submitted" && product.status !== "changes_requested") {
    return { ok: false as const, error: "Only submitted products can be reviewed" };
  }

  const newStatus =
    decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested";

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    status: newStatus,
    reviewed_at: now,
    admin_notes: notes || null,
  };

  if (decision === "reject") {
    updateData.rejection_reason = notes;
  }

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  // Record review in submission history
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("submission_history").insert({
      product_id: productId,
      action: decision,
      from_status: product.status,
      to_status: newStatus,
      notes: notes || null,
      reviewed_by: user.id,
    });
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/dashboard/products/${productId}`);

  return { ok: true as const };
}

export async function getAllPartners() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("partner_profiles")
    .select("*, profiles(email, full_name)")
    .order("created_at", { ascending: false });

  return (data ?? []) as Array<{
    id: string;
    user_id: string;
    brand_name: string;
    profiles: { email: string; full_name: string } | null;
  }>;
}

export async function getAllProductsForAdmin() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("products")
    .select("*, partner_profiles(brand_name), profiles(full_name)")
    .order("created_at", { ascending: false });

  return (data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    partner_id: string;
    partner_profiles: { brand_name: string } | null;
    profiles: { full_name: string } | null;
    created_at: string;
  }>;
}

export async function getAdminProduct(productId: string) {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("products")
    .select("*, product_stories(*), makers(*), product_media(*), partner_profiles(brand_name)")
    .eq("id", productId)
    .single();

  return data;
}