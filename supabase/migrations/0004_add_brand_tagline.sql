-- ============================================================
-- Add brand_tagline to partner_profiles
-- ============================================================

alter table public.partner_profiles
  add column if not exists brand_tagline text;

comment on column public.partner_profiles.brand_tagline is 'Short tagline or slogan for the partner brand.';
