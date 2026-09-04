-- ============================================================
-- Add missing columns to partner_profiles
-- This is idempotent — safe to run multiple times
-- ============================================================

-- Add brand_name if missing (profile-level branding)
alter table public.partner_profiles
  add column if not exists brand_name text not null default '';

-- Add bio if missing (partner biography)
alter table public.partner_profiles
  add column if not exists bio text;

-- Add website if missing
alter table public.partner_profiles
  add column if not exists website text;

-- Add address fields if missing
alter table public.partner_profiles
  add column if not exists address_line1 text;

alter table public.partner_profiles
  add column if not exists address_line2 text;

-- Ensure partner_id column exists on products
alter table public.products
  add column if not exists partner_id uuid references public.partner_profiles(id);

-- Ensure status columns exist on products
alter table public.products
  add column if not exists status text not null default 'draft';

alter table public.products
  add column if not exists submitted_at timestamptz;

alter table public.products
  add column if not exists reviewed_at timestamptz;

alter table public.products
  add column if not exists reviewed_by uuid references auth.users(id);

alter table public.products
  add column if not exists admin_notes text;

alter table public.products
  add column if not exists rejection_reason text;
