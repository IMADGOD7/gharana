// ============================================================
// Product Server Actions (T4)
// All product mutations happen here — never from the client
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

// Support both generated types (Database namespace) and placeholder types (plain interfaces)
export type ProductRow = {
  id: string;
  partner_id: string;
  title: string;
  description: string;
  category: string | null;
  tags: string[] | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  status: string;
  admin_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductWithRelations = ProductRow & {
  product_stories: {
    id: string;
    product_id: string;
    inspiration: string;
    crafting_process: string;
    cultural_context: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  makers: Array<{
    id: string;
    product_id: string;
    name: string;
    bio: string | null;
    craft_technique: string;
    years_of_experience: number | null;
    location: string | null;
    created_at: string;
    updated_at: string;
  }>;
  product_media: Array<{
    id: string;
    product_id: string;
    media_type: string;
    storage_path: string;
    caption: string | null;
    sort_order: number;
    created_at: string;
  }>;
};

// ============================================================
// Queries
// ============================================================

export async function getProducts(): Promise<ProductRow[]> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role === "admin") {
    const { data } = await supabase
      .from("products")
      .select("*, partner_profiles(brand_name), profiles(full_name)")
      .order("created_at", { ascending: false });
    return (data ?? []) as ProductRow[];
  }

  const { data: partnerProfile } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("user_id", profile.id)
    .single<{ id: string }>();

  if (!partnerProfile) {
    const autoProfile = await getOrCreatePartnerProfile(supabase, profile.id);
    if (!autoProfile) return [];
    // Use autoProfile.id for the products query
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("partner_id", autoProfile.id)
      .order("created_at", { ascending: false });
    return (data ?? []) as ProductRow[];
  }

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("partner_id", partnerProfile.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as ProductRow[];
}

export async function getProduct(id: string): Promise<ProductWithRelations | null> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, product_stories(*), makers(*), product_media(*)")
    .eq("id", id)
    .single<ProductWithRelations>();

  if (error || !data) return null;

  if (profile.role !== "admin") {
    const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);

    if (!partnerProfile || data.partner_id !== partnerProfile.id) {
      return null;
    }
  }

  return data;
}

export async function getDrafts(): Promise<ProductRow[]> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  const { data: partnerProfile } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("user_id", profile.id)
    .single<{ id: string }>();

  if (!partnerProfile) return [];

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("partner_id", partnerProfile.id)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });

  return (data ?? []) as ProductRow[];
}

// ============================================================
// Mutations
// ============================================================

export type ProductFormData = {
  title: string;
  description: string;
  category: string;
  tags: string;
  price_min: string;
  price_max: string;
  currency: string;
};

export async function createProduct(formData: FormData): Promise<{ ok: true; data: { id: string } } | { ok: false; error: string }> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  // Get or create the partner profile (handles existing users who signed up before the callback fix)
  let partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);

  if (!partnerProfile) {
    return { ok: false, error: "Failed to set up partner profile. Please contact support." };
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const tagsRaw = String(formData.get("tags") || "").trim();
  const priceMin = formData.get("price_min") ? parseFloat(String(formData.get("price_min"))) : null;
  const priceMax = formData.get("price_max") ? parseFloat(String(formData.get("price_max"))) : null;
  const currency = String(formData.get("currency") || "INR").trim();

  if (!title) {
    return { ok: false, error: "Title is required" };
  }

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    return { ok: false, error: "Minimum price cannot exceed maximum price" };
  }

  const insertData: Record<string, unknown> = {
    partner_id: partnerProfile.id,
    title,
    description: description || "",
    category,
    tags,
    price_min: priceMin,
    price_max: priceMax,
    currency,
    status: "draft",
  };

  const { data, error } = await supabase
    .from("products")
    .insert(insertData)
    .select("id")
    .single<ProductRow>();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { ok: true, data: { id: data.id } };
}

export async function updateProduct(id: string, formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("partner_id, status")
    .eq("id", id)
    .single<ProductRow>();

  if (!product) {
    return { ok: false, error: "Product not found" };
  }

  if (profile.role !== "admin") {
    const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);

    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return { ok: false, error: "Not authorized" };
    }

    if (product.status !== "draft") {
      return { ok: false, error: "Only draft products can be edited" };
    }
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const tagsRaw = String(formData.get("tags") || "").trim();
  const priceMin = formData.get("price_min") ? parseFloat(String(formData.get("price_min"))) : null;
  const priceMax = formData.get("price_max") ? parseFloat(String(formData.get("price_max"))) : null;
  const currency = String(formData.get("currency") || "INR").trim();

  if (!title) {
    return { ok: false, error: "Title is required" };
  }

  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    return { ok: false, error: "Minimum price cannot exceed maximum price" };
  }

  const { error } = await supabase
    .from("products")
    .update({
      title,
      description: description || "",
      category,
      tags,
      price_min: priceMin,
      price_max: priceMax,
      currency,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/products/${id}`);
  revalidatePath("/dashboard/products");
  return { ok: true };
}

export async function submitProduct(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("partner_id, status")
    .eq("id", id)
    .single<ProductRow>();

  if (!product) {
    return { ok: false, error: "Product not found" };
  }

  if (profile.role !== "admin") {
    const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);

    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return { ok: false, error: "Not authorized" };
    }
  }

  if (product.status !== "draft") {
    return { ok: false, error: "Only draft products can be submitted" };
  }

  const { data: fullProduct } = await supabase
    .from("products")
    .select("title, description, product_stories(id), makers(id)")
    .eq("id", id)
    .single<ProductRow & { product_stories: { id: string } | null; makers: { id: string }[] }>();

  if (!fullProduct?.title || !fullProduct?.description) {
    return { ok: false, error: "Product must have a title and description" };
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("products")
    .update({
      status: "submitted",
      submitted_at: now,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.from("submission_history").insert({
    product_id: id,
    action: "approve",
    from_status: "draft",
    to_status: "submitted",
    notes: "Product submitted for review",
    reviewed_by: profile.id,
  });

  revalidatePath(`/dashboard/products/${id}`);
  revalidatePath("/dashboard/products");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("partner_id")
    .eq("id", id)
    .single<ProductRow>();

  if (!product) {
    return { ok: false, error: "Product not found" };
  }

  if (profile.role !== "admin") {
    const { data: partnerProfile } = await supabase
      .from("partner_profiles")
      .select("id")
      .eq("user_id", profile.id)
      .single<{ id: string }>();

    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return { ok: false, error: "Not authorized" };
    }
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { ok: true };
}

/**
 * Get the partner profile for the given user, creating one if it doesn't exist.
 * Self-healing helper for users who signed up before the auth-callback
 * profile creation was added. Exported so other modules can reuse it.
 */
export async function getOrCreatePartnerProfile(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<{ id: string } | null> {
  const { data: existing } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("user_id", userId)
    .single<{ id: string }>();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("partner_profiles")
    .insert({ user_id: userId, brand_name: "" })
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    console.error("[getOrCreatePartnerProfile] Failed:", JSON.stringify(error));
    console.error("[getOrCreatePartnerProfile] User ID:", userId);
    // Try to determine if it's a FK constraint issue
    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();
    console.error("[getOrCreatePartnerProfile] Profile exists?", !!profileCheck);
    return null;
  }

  return created;
}
// ============================================================
// Search & filter for partner product list
// ============================================================
export async function getPartnerProductsFiltered(options: {
  status?: string;
  search?: string;
}) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  const { data: partnerProfile } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("user_id", profile.id)
    .single<{ id: string }>();

  if (!partnerProfile) {
    const autoProfile = await getOrCreatePartnerProfile(supabase, profile.id);
    if (!autoProfile) return [];
  }

  const partnerId = partnerProfile?.id;
  if (!partnerId) return [];

  let query = supabase
    .from("products")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  const { data } = await query;
  return (data ?? []) as ProductRow[];
}
