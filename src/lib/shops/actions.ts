// ============================================================
// Shop Server Actions
// Partners manage their shop(s); Admins view them.
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { getOrCreatePartnerProfile } from "@/lib/products/actions";

export type ShopRow = {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  established_year: number | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export async function getPartnerShops() {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role === "admin") {
    const { data } = await supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []) as ShopRow[];
  }

  const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);
  if (!partnerProfile) return [];

  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("partner_id", partnerProfile.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as ShopRow[];
}

export async function getShop(shopId: string) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role === "admin") {
    const { data } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single<ShopRow>();
    return data ?? null;
  }

  const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);
  if (!partnerProfile) return null;

  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .eq("partner_id", partnerProfile.id)
    .single<ShopRow>();

  return data ?? null;
}

export async function upsertShop(formData: FormData) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role === "admin") {
    return { ok: false as const, error: "Admins cannot edit shops" };
  }

  const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);
  if (!partnerProfile) {
    return { ok: false as const, error: "Partner profile not found" };
  }

  const shopId = String(formData.get("shopId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const city = String(formData.get("city") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;
  const country = String(formData.get("country") || "").trim() || "India";
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const website = String(formData.get("website") || "").trim() || null;
  const establishedYear = String(formData.get("established_year") || "").trim();
  const isPrimary = formData.get("is_primary") === "on";

  if (!name) {
    return { ok: false as const, error: "Shop name is required" };
  }

  if (shopId) {
    const { data: existing } = await supabase
      .from("shops")
      .select("partner_id")
      .eq("id", shopId)
      .single<{ partner_id: string }>();

    if (!existing || existing.partner_id !== partnerProfile.id) {
      return { ok: false as const, error: "Shop not found" };
    }

    if (isPrimary) {
      await supabase
        .from("shops")
        .update({ is_primary: false })
        .eq("partner_id", partnerProfile.id)
        .neq("id", shopId);
    }

    const { error } = await supabase
      .from("shops")
      .update({
        name,
        description,
        address,
        city,
        state,
        country,
        phone,
        email,
        website,
        established_year: establishedYear ? parseInt(establishedYear) : null,
        is_primary: isPrimary,
      })
      .eq("id", shopId);

    if (error) {
      return { ok: false as const, error: error.message };
    }
  } else {
    if (isPrimary) {
      await supabase
        .from("shops")
        .update({ is_primary: false })
        .eq("partner_id", partnerProfile.id);
    }

    const { error } = await supabase
      .from("shops")
      .insert({
        partner_id: partnerProfile.id,
        name,
        description,
        address,
        city,
        state,
        country,
        phone,
        email,
        website,
        established_year: establishedYear ? parseInt(establishedYear) : null,
        is_primary: isPrimary,
      });

    if (error) {
      return { ok: false as const, error: error.message };
    }
  }

  revalidatePath("/dashboard/shops");
  revalidatePath("/admin/partners");
  return { ok: true as const };
}

export async function deleteShop(shopId: string) {
  const profile = await requireAuth();
  const supabase = await createServerClient();

  if (profile.role === "admin") {
    return { ok: false as const, error: "Admins cannot delete shops" };
  }

  const partnerProfile = await getOrCreatePartnerProfile(supabase, profile.id);
  if (!partnerProfile) {
    return { ok: false as const, error: "Partner profile not found" };
  }

  const { data: existing } = await supabase
    .from("shops")
    .select("partner_id")
    .eq("id", shopId)
    .single<{ partner_id: string }>();

  if (!existing || existing.partner_id !== partnerProfile.id) {
    return { ok: false as const, error: "Shop not found" };
  }

  const { error } = await supabase
    .from("shops")
    .delete()
    .eq("id", shopId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard/shops");
  return { ok: true as const };
}
