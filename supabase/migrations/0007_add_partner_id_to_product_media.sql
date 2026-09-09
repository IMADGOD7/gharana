-- ============================================================
-- Migration 0007: Add partner_id to product_media
--
-- The product_media table was created without partner_id in
-- migration 0001. Application code (media/actions.ts, RLS
-- policies) requires this column for:
--   - Ownership verification in server actions
--   - Storage path generation (partner-scoped)
--   - RLS policy joins
--
-- This migration adds the column, backfills existing rows
-- from the products table, and creates an index.
-- ============================================================

-- 1. Add the column (nullable first so we can backfill)
alter table public.product_media
  add column if not exists partner_id uuid;

-- 2. Backfill from products table for any existing rows
update public.product_media pm
set partner_id = p.partner_id
from public.products p
where pm.product_id = p.id
  and pm.partner_id is null;

-- 3. Now make it NOT NULL (all rows should have a value)
alter table public.product_media
  alter column partner_id set not null;

-- 4. Add the foreign key reference
alter table public.product_media
  add constraint fk_product_media_partner
    foreign key (partner_id)
    references public.partner_profiles(id)
    on delete cascade;

-- 5. Index for the media-by-partner queries used in RLS and server actions
create index if not exists idx_product_media_partner_id
  on public.product_media(partner_id);
