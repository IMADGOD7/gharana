-- ============================================================
-- Migration 0007: Add partner_id to product_media
--
-- The product_media table was created without partner_id in
-- migration 0001. Application code (media/actions.ts, RLS
-- policies) requires this column for:
--   - Ownership verification in server actions
--   - Storage path generation (partner-scoped)
--   - RLS policy joins
-- ============================================================

-- 1. Add the column (idempotent)
alter table public.product_media
  add column if not exists partner_id uuid;

-- 2. Backfill from products table for any existing rows
update public.product_media pm
set partner_id = p.partner_id
from public.products p
where pm.product_id = p.id
  and pm.partner_id is null;

-- 3. Make it NOT NULL
alter table public.product_media
  alter column partner_id set not null;

-- 4. Add the foreign key (check existence first — PG doesn't support IF NOT EXISTS for constraints)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_product_media_partner'
      and conrelid = 'public.product_media'::regclass
  ) then
    alter table public.product_media
      add constraint fk_product_media_partner
        foreign key (partner_id)
        references public.partner_profiles(id)
        on delete cascade;
  end if;
end $$;

-- 5. Index for partner-scoped queries
create index if not exists idx_product_media_partner_id
  on public.product_media(partner_id);
