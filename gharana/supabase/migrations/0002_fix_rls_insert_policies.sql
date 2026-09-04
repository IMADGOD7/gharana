-- ============================================================
-- Fix: Allow partners to insert their own profile rows
-- This enables self-healing for legacy accounts that were
-- created before the auth callback trigger was set up.
-- ============================================================

-- Allow partners to insert their own profile (self-healing)
create policy "Partners insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- Allow partners to insert their own partner profile (self-healing)
create policy "Partners insert own partner profile"
  on public.partner_profiles for insert to authenticated
  with check (user_id = auth.uid());
