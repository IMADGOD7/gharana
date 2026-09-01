-- ============================================================
-- PandaVerse Gharana Partner Portal
-- T0.2: Initial Schema + RLS + Storage Policies
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. CUSTOM TYPES
-- ============================================================
create type submission_status as enum ('draft', 'submitted', 'changes_requested', 'approved', 'rejected');
create type review_action as enum ('approve', 'reject', 'request_changes');
create type media_type as enum ('image', 'video');

-- ============================================================
-- 3. PROFILES (extends Supabase Auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'partner' check (role in ('partner', 'admin')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profiles extending Supabase Auth users. Role determines access level.';

-- ============================================================
-- 4. PARTNER PROFILES
-- ============================================================
create table public.partner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  brand_name text not null default '',
  bio text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'India',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.partner_profiles is 'Business/brand information for partner accounts.';

-- ============================================================
-- 5. SHOPS
-- ============================================================
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  name text not null,
  description text,
  address text,
  city text,
  state text,
  country text default 'India',
  phone text,
  email text,
  website text,
  established_year int,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shops is 'Physical/virtual shops associated with a partner.';

create index idx_shops_partner_id on public.shops(partner_id);

-- ============================================================
-- 6. PRODUCTS
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text,
  tags text[] default '{}',
  price_min numeric(10,2),
  price_max numeric(10,2),
  currency text not null default 'INR',
  status submission_status not null default 'draft',
  admin_notes text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is 'Core product entity. Partners own products. Status tracks submission lifecycle.';

create index idx_products_partner_id on public.products(partner_id);
create index idx_products_status on public.products(status);
create index idx_products_created_at on public.products(created_at desc);

-- ============================================================
-- 7. PRODUCT STORIES
-- ============================================================
create table public.product_stories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade unique,
  inspiration text not null default '',
  crafting_process text not null default '',
  materials_used text not null default '',
  time_to_create text,
  cultural_significance text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_stories is 'Narrative/story content for a product. One-to-one with product.';

-- ============================================================
-- 8. MAKERS
-- ============================================================
create table public.makers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade unique,
  name text not null default '',
  bio text not null default '',
  craft_technique text not null default '',
  years_of_experience int,
  location text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.makers is 'Artisan/maker information for a product.';

-- ============================================================
-- 9. PRODUCT MEDIA
-- ============================================================
create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_type media_type not null,
  storage_path text not null,
  file_name text not null,
  file_size_bytes bigint,
  mime_type text,
  display_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.product_media is 'Media files (photos/videos) for products. Stored in Supabase Storage.';

create index idx_product_media_product_id on public.product_media(product_id);

-- ============================================================
-- 10. SUBMISSION HISTORY (AUDIT LOG)
-- ============================================================
create table public.submission_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  action review_action not null,
  from_status submission_status not null,
  to_status submission_status not null,
  notes text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.submission_history is 'Audit trail for product submission status changes.';

create index idx_submission_history_product_id on public.submission_history(product_id);
create index idx_submission_history_created_at on public.submission_history(created_at desc);

-- ============================================================
-- 11. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 11b. UPDATED_AT TRIGGERS (individual statements)
-- ============================================================
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger trg_partner_profiles_updated_at
  before update on public.partner_profiles
  for each row execute function public.update_updated_at_column();

create trigger trg_shops_updated_at
  before update on public.shops
  for each row execute function public.update_updated_at_column();

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();

create trigger trg_product_stories_updated_at
  before update on public.product_stories
  for each row execute function public.update_updated_at_column();

create trigger trg_makers_updated_at
  before update on public.makers
  for each row execute function public.update_updated_at_column();

create trigger trg_product_media_updated_at
  before update on public.product_media
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.partner_profiles enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.product_stories enable row level security;
alter table public.makers enable row level security;
alter table public.product_media enable row level security;
alter table public.submission_history enable row level security;

-- ============================================================
-- 13. RLS POLICIES
-- ============================================================

-- -- Profiles --
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (
    (auth.jwt() ->> 'user_role')::text = 'admin'
    or auth.uid() = id
  );

-- -- Partner Profiles --
create policy "Partners can view own partner profile"
  on public.partner_profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.partner_profiles
      where user_id = auth.uid()
    )
  );

create policy "Partners can insert own partner profile"
  on public.partner_profiles for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

create policy "Partners can update own partner profile"
  on public.partner_profiles for update
  to authenticated
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );

create policy "Admins can view all partner profiles"
  on public.partner_profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -- Shops --
create policy "Partners can CRUD own shops"
  on public.shops for all
  to authenticated
  using (
    exists (
      select 1 from public.partner_profiles
      where id = shops.partner_id and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.partner_profiles
      where id = shops.partner_id and user_id = auth.uid()
    )
  );

create policy "Admins can view all shops"
  on public.shops for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -- Products --
create policy "Partners can CRUD own products"
  on public.products for all
  to authenticated
  using (
    exists (
      select 1 from public.partner_profiles
      where id = products.partner_id and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.partner_profiles
      where id = products.partner_id and user_id = auth.uid()
    )
  );

create policy "Admins can view all products"
  on public.products for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update product status"
  on public.products for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -- Product Stories --
create policy "Partners can CRUD own product stories"
  on public.product_stories for all
  to authenticated
  using (
    exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where p.id = product_stories.product_id and pp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where p.id = product_stories.product_id and pp.user_id = auth.uid()
    )
  );

create policy "Admins can view all product stories"
  on public.product_stories for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -- Makers --
create policy "Partners can CRUD own makers"
  on public.makers for all
  to authenticated
  using (
    exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where p.id = makers.product_id and pp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where p.id = makers.product_id and pp.user_id = auth.uid()
    )
  );

create policy "Admins can view all makers"
  on public.makers for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -- Product Media --
create policy "Partners can CRUD own product media"
  on public.product_media for all
  to authenticated
  using (
    exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where p.id = product_media.product_id and pp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where p.id = product_media.product_id and pp.user_id = auth.uid()
    )
  );

create policy "Admins can view all product media"
  on public.product_media for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -- Submission History --
create policy "Partners can view own submission history"
  on public.submission_history for select
  to authenticated
  using (
    exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where p.id = submission_history.product_id and pp.user_id = auth.uid()
    )
  );

create policy "Admins can view and insert submission history"
  on public.submission_history for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- 14. STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-photos', 'product-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('product-videos', 'product-videos', false, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

-- ============================================================
-- 15. STORAGE POLICIES
-- ============================================================

-- -- Product Photos --
create policy "Partners can upload product photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-photos'
    and exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where pp.user_id = auth.uid()
    )
  );

create policy "Partners can view own product photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-photos'
    and exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where pp.user_id = auth.uid()
    )
  );

create policy "Partners can delete own product photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-photos'
    and exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where pp.user_id = auth.uid()
    )
  );

create policy "Admins can manage all photos"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'product-photos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -- Product Videos --
create policy "Partners can upload product videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-videos'
    and exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where pp.user_id = auth.uid()
    )
  );

create policy "Partners can view own product videos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-videos'
    and exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where pp.user_id = auth.uid()
    )
  );

create policy "Partners can delete own product videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-videos'
    and exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where pp.user_id = auth.uid()
    )
  );

create policy "Admins can manage all videos"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'product-videos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
