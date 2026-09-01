-- ============================================================
-- Fix RLS infinite recursion on profiles table
-- ============================================================
-- Problem: Admin policies query public.profiles to check role,
-- but that triggers the same policy → infinite recursion.
-- Solution: A SECURITY DEFINER function that bypasses RLS.

create or replace function public.is_admin(_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = _user_id and role = 'admin'
  );
end;
$$ language plpgsql security definer;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- Drop and recreate the problematic admin policy on profiles
drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin(auth.uid()) or auth.uid() = id);

-- Fix admin policies on partner_profiles
drop policy if exists "Admins can view all partner profiles" on public.partner_profiles;

create policy "Admins can view all partner profiles"
  on public.partner_profiles for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Fix admin policies on shops
drop policy if exists "Admins can view all shops" on public.shops;

create policy "Admins can view all shops"
  on public.shops for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Fix admin policies on products
drop policy if exists "Admins can view all products" on public.products;
drop policy if exists "Admins can update product status" on public.products;

create policy "Admins can view all products"
  on public.products for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins can update product status"
  on public.products for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Fix admin policies on product_stories
drop policy if exists "Admins can view all product stories" on public.product_stories;

create policy "Admins can view all product stories"
  on public.product_stories for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Fix admin policies on makers
drop policy if exists "Admins can view all makers" on public.makers;

create policy "Admins can view all makers"
  on public.makers for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Fix admin policies on product_media
drop policy if exists "Admins can view all product media" on public.product_media;

create policy "Admins can view all product media"
  on public.product_media for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Fix admin policies on submission_history
drop policy if exists "Admins can view and insert submission history" on public.submission_history;

create policy "Admins can view and insert submission history"
  on public.submission_history for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));