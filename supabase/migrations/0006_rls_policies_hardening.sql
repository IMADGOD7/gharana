-- ============================================================
-- PandaVerse Gharana Partner Portal
-- T0.6: RLS policies for new tables (audit_logs,
--        product_state_transitions) and policy hardening
-- ============================================================

-- ============================================================
-- 1. AUDIT_LOGS — server-only inserts, scoped reads
-- ============================================================
alter table public.audit_logs enable row level security;

-- No direct INSERT from clients — audit logs are written by
-- server-side code using the service-role client or a
-- SECURITY DEFINER function.
create policy "No direct inserts"
  on public.audit_logs for insert
  to authenticated
  with check (false);

-- Partners can read their own audit entries
create policy "Partners can view own audit logs"
  on public.audit_logs for select
  to authenticated
  using (
    actor_id = auth.uid()
  );

-- Admins can read all audit logs
create policy "Admins can view all audit logs"
  on public.audit_logs for select
  to authenticated
  using (
    public.is_admin(auth.uid())
  );

-- ============================================================
-- 2. PRODUCT_STATE_TRANSITIONS — server-only inserts,
--    scoped reads
-- ============================================================
alter table public.product_state_transitions enable row level security;

-- No direct INSERT from clients — state transitions are
-- written via the transition_product_state() function which
-- is SECURITY DEFINER.
create policy "No direct inserts"
  on public.product_state_transitions for insert
  to authenticated
  with check (false);

-- Partners can view transitions for their own products
create policy "Partners can view own product transitions"
  on public.product_state_transitions for select
  to authenticated
  using (
    exists (
      select 1 from public.products p
      join public.partner_profiles pp on pp.id = p.partner_id
      where p.id = product_state_transitions.product_id
        and pp.user_id = auth.uid()
    )
  );

-- Admins can view all transitions
create policy "Admins can view all product transitions"
  on public.product_state_transitions for select
  to authenticated
  using (
    public.is_admin(auth.uid())
  );

-- ============================================================
-- 3. Harden product_media policies — use partner_id directly
-- ============================================================
-- Drop the old policies that join through products (they work
-- but are slower; now that product_media has partner_id, we
-- can filter directly).
drop policy if exists "Partners can CRUD own product media" on public.product_media;
drop policy if exists "Admins can view all product media" on public.product_media;

-- Partners can CRUD their own media (by partner_id directly)
create policy "Partners can CRUD own product media"
  on public.product_media for all
  to authenticated
  using (
    partner_id in (
      select pp.id
      from public.partner_profiles pp
      where pp.user_id = auth.uid()
    )
  )
  with check (
    partner_id in (
      select pp.id
      from public.partner_profiles pp
      where pp.user_id = auth.uid()
    )
  );

-- Admins can view and manage all media
create policy "Admins can view and manage all product media"
  on public.product_media for all
  to authenticated
  using (
    public.is_admin(auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
  );

-- ============================================================
-- 4. Harden product_stories policies — use is_admin()
-- ============================================================
drop policy if exists "Admins can view all product stories" on public.product_stories;

create policy "Admins can view and manage all product stories"
  on public.product_stories for all
  to authenticated
  using (
    public.is_admin(auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
  );

-- ============================================================
-- 5. Harden makers policies — use is_admin()
-- ============================================================
drop policy if exists "Admins can view all makers" on public.makers;

create policy "Admins can view and manage all makers"
  on public.makers for all
  to authenticated
  using (
    public.is_admin(auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
  );

-- ============================================================
-- 6. Harden submission_history policies — use is_admin()
-- ============================================================
drop policy if exists "Admins can view and insert submission history" on public.submission_history;

create policy "Admins can manage submission history"
  on public.submission_history for all
  to authenticated
  using (
    public.is_admin(auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
  );

-- ============================================================
-- 7. Prevent Partners from modifying their own role
-- ============================================================
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
  );

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
  );

create policy "Users can update own non-role fields"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = id
  )
  with check (
    auth.uid() = id
    -- Prevent role escalation: the role column cannot change
    and old.role = new.role
  );

-- Admins can update anything including role
create policy "Admins can manage all profiles"
  on public.profiles for all
  to authenticated
  using (
    public.is_admin(auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
  );

-- ============================================================
-- 8. Prevent service-role bypass detection in Storage
--    (path-based access for Partners)
-- ============================================================
-- The existing storage policies allow Partners to upload/view/delete
-- without path restriction (they check product ownership via the DB).
-- This is acceptable because:
-- 1. The signed URL is scoped server-side to the correct path
-- 2. RLS on the DB tables prevents cross-partner access
-- 3. Admin access is mediated by the application (service-role only)
--
-- However, for defense in depth, we add a path-prefix check to
-- storage policies as well.

-- Drop existing partner storage policies and recreate with path checks
drop policy if exists "Partners can upload product photos" on storage.objects;
drop policy if exists "Partners can view own product photos" on storage.objects;
drop policy if exists "Partners can delete own product photos" on storage.objects;
drop policy if exists "Partners can upload product videos" on storage.objects;
drop policy if exists "Partners can view own product videos" on storage.objects;
drop policy if exists "Partners can delete own product videos" on storage.objects;

-- Photos: path must start with {partner_id}/
create policy "Partners can upload product photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-photos'
    and public.is_admin(auth.uid())
    and (
      -- Admin path (no restriction) OR Partner path check
      public.is_admin(auth.uid())
      or
      -- Partner: path must be under their own partner_id
      -- The path convention is {partner_id}/{product_id}/{filename}
      -- We verify the partner owns a product matching the path
      exists (
        select 1 from public.products p
        join public.partner_profiles pp on pp.id = p.partner_id
        where pp.user_id = auth.uid()
          and storage.objects.name like pp.id::text || '/%'
      )
    )
  );

create policy "Partners can view own product photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-photos'
    and (
      public.is_admin(auth.uid())
      or
      exists (
        select 1 from public.products p
        join public.partner_profiles pp on pp.id = p.partner_id
        where pp.user_id = auth.uid()
          and storage.objects.name like pp.id::text || '/%'
      )
    )
  );

create policy "Partners can delete own product photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-photos'
    and (
      public.is_admin(auth.uid())
      or
      exists (
        select 1 from public.products p
        join public.partner_profiles pp on pp.id = p.partner_id
        where pp.user_id = auth.uid()
          and storage.objects.name like pp.id::text || '/%'
      )
    )
  );

-- Videos: same pattern
create policy "Partners can upload product videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-videos'
    and (
      public.is_admin(auth.uid())
      or
      exists (
        select 1 from public.products p
        join public.partner_profiles pp on pp.id = p.partner_id
        where pp.user_id = auth.uid()
          and storage.objects.name like pp.id::text || '/%'
      )
    )
  );

create policy "Partners can view own product videos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-videos'
    and (
      public.is_admin(auth.uid())
      or
      exists (
        select 1 from public.products p
        join public.partner_profiles pp on pp.id = p.partner_id
        where pp.user_id = auth.uid()
          and storage.objects.name like pp.id::text || '/%'
      )
    )
  );

create policy "Partners can delete own product videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-videos'
    and (
      public.is_admin(auth.uid())
      or
      exists (
        select 1 from public.products p
        join public.partner_profiles pp on pp.id = p.partner_id
        where pp.user_id = auth.uid()
          and storage.objects.name like pp.id::text || '/%'
      )
    )
  );
