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
  primary_media?: {
    storage_path: string;
    media_type: "image" | "video";
    file_name: string | null;
  } | null;
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

export async function getSubmissionHistory(productId: string) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  // Verify product ownership (partner can only see their own, admin can see all)
  const { data: product } = await supabase
    .from("products")
    .select("partner_id, status")
    .eq("id", productId)
    .single<ProductRow>();

  if (!product) return [];

  if (profile.role !== "admin") {
    const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);
    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return [];
    }
  }

  // Fetch submission history — works for both draft (history empty) and submitted/approved/rejected
  const { data } = await supabase
    .from("submission_history")
    .select("id, action, from_status, to_status, notes, reviewed_by, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  return (data ?? []) as Array<{
    id: string;
    action: string;
    from_status: string | null;
    to_status: string;
    notes: string | null;
    reviewed_by: string | null;
    created_at: string;
  }>;
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

// ============================================================
// Autosave (D-UX-03)
// ============================================================
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface AutosaveResult {
  ok: boolean;
  productId?: string;
  error?: string;
}

/**
 * Creates or updates a draft product for autosave purposes.
 * Unlike createProduct, this does not redirect on create mode.
 * The caller (wizard) manages navigation.
 */
export async function upsertProductDraft(
  productId: string | undefined,
  formData: FormData
): Promise<AutosaveResult> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

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

  if (productId) {
    const { data: product } = await supabase
      .from("products")
      .select("partner_id, status")
      .eq("id", productId)
      .single<{ partner_id: string; status: string }>();

    if (!product) {
      return { ok: false, error: "Product not found" };
    }

    const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);
    if (!partnerProfile || product.partner_id !== partnerProfile.id) {
      return { ok: false, error: "Not authorized" };
    }

    if (product.status !== "draft") {
      return { ok: false, error: "Only draft products can be edited" };
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
      .eq("id", productId);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${productId}`);
    return { ok: true, productId };
  }

  const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);
  if (!partnerProfile) {
    return { ok: false, error: "Failed to set up partner profile. Please contact support." };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      partner_id: partnerProfile.id,
      title,
      description: description || "",
      category,
      tags,
      price_min: priceMin,
      price_max: priceMax,
      currency,
      status: "draft",
    })
    .select("id")
    .single<ProductRow>();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to create draft" };
  }

  revalidatePath("/dashboard/products");
  return { ok: true, productId: data.id };
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

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
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
  const { data, error } = await supabase
    .from("partner_profiles")
    .upsert({ user_id: userId, brand_name: "" }, { onConflict: "user_id" })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    console.error("[getOrCreatePartnerProfile] failed:", error);
    return null;
  }

  return data;
}
// ============================================================
// Search & filter for partner product list (with primary media for grid view)
// ============================================================
export async function getPartnerProductsWithMedia(options: {
  status?: string;
  search?: string;
}): Promise<ProductRow[]> {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  const { data: partnerRow } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("user_id", profile.id)
    .single<{ id: string }>();

  let partnerId: string;
  if (partnerRow) {
    partnerId = partnerRow.id;
  } else {
    const autoProfile = await getOrCreatePartnerProfile(supabase, profile.id);
    if (!autoProfile) return [];
    partnerId = autoProfile.id;
  }

  let query = supabase
    .from("products")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.search) {
    const term = options.search.slice(0, 200).replace(/[,;()]/g, " ").trim();
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%`
      );
    }
  }

  const { data: products } = await query;

  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const { data: mediaRows } = await supabase
    .from("product_media")
    .select("product_id, storage_path, media_type, file_name, is_primary, sort_order")
    .in("product_id", productIds)
    .eq("is_primary", true)
    .order("sort_order", { ascending: true });

  const primaryByProduct = new Map<string, {
    storage_path: string;
    media_type: "image" | "video";
    file_name: string | null;
  }>();

  for (const m of mediaRows ?? []) {
    if (!primaryByProduct.has(m.product_id)) {
      primaryByProduct.set(m.product_id, {
        storage_path: m.storage_path,
        media_type: m.media_type as "image" | "video",
        file_name: m.file_name,
      });
    }
  }

  return products.map((p) => ({
    ...p,
    primary_media: primaryByProduct.get(p.id) ?? null,
  })) as ProductRow[];
}

export async function getPartnerProductsFiltered(options: {
  status?: string;
  search?: string;
}) {
  const products = await getPartnerProductsWithMedia(options);
  return products.map(({ primary_media, ...rest }) => rest) as ProductRow[];
}
