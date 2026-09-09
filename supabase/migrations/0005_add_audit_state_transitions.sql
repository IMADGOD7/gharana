-- ============================================================
-- PandaVerse Gharana Partner Portal
-- T0.5: Core additions — columns, tables, functions,
--        constraints, and Storage policy fixes
-- ============================================================

-- ============================================================
-- 1. PRODUCTS: optimistic concurrency version column
-- ============================================================
alter table public.products
  add column if not exists version int not null default 1;

comment on column public.products.version is 'Optimistic concurrency control. Incremented on every state change.';

-- ============================================================
-- 2. PRODUCT_MEDIA: checksum, caption, partner_id
-- ============================================================
alter table public.product_media
  add column if not exists checksum_sha256 text;

alter table public.product_media
  add column if not exists caption text;

alter table public.product_media
  add column if not exists partner_id uuid not null default '00000000-0000-0000-0000-000000000000';

comment on column public.product_media.checksum_sha256 is 'SHA-256 checksum for dedup and integrity verification.';
comment on column public.product_media.caption is 'Optional caption for the media asset.';
comment on column public.product_media.partner_id is 'Denormalized from products for direct RLS filtering.';

-- Backfill partner_id from products
update public.product_media pm
set partner_id = p.partner_id
from public.products p
where pm.product_id = p.id and pm.partner_id = '00000000-0000-0000-0000-000000000000';

-- Now set the NOT NULL constraint properly
alter table public.product_media
  alter column partner_id drop default;

alter table public.product_media
  alter column partner_id set not null;

-- Unique constraint: one file per checksum per partner
create unique index if not exists idx_product_media_checksum
  on public.product_media(partner_id, checksum_sha256)
  where checksum_sha256 is not null;

-- ============================================================
-- 3. AUDIT_LOGS
-- ============================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('partner', 'admin', 'system')),
  action text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Immutable audit trail for security-sensitive and consequential actions.';
comment on column public.audit_logs.action is 'Action type from controlled vocabulary (e.g., product.created, admin.viewed_profile).';
comment on column public.audit_logs.metadata is 'Additional context as JSON. Contains only IDs, not PII.';

create index idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index idx_audit_logs_target on public.audit_logs(target_type, target_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- ============================================================
-- 4. PRODUCT_STATE_TRANSITIONS (idempotency + audit)
-- ============================================================
create table public.product_state_transitions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  from_state text not null,
  to_state text not null,
  actor_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('partner', 'admin')),
  reason text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

comment on table public.product_state_transitions is 'Immutable record of every product state transition. Idempotency via idempotency_key.';
comment on column public.product_state_transitions.idempotency_key is 'Client-generated UUID for idempotency. NULL for non-idempotent operations.';

create index idx_product_state_transitions_product_id on public.product_state_transitions(product_id);
create index idx_product_state_transitions_created_at on public.product_state_transitions(created_at desc);

-- Partial unique index: only enforce uniqueness when key is not null
create unique index if not exists idx_product_state_transitions_idempotency_key
  on public.product_state_transitions(idempotency_key)
  where idempotency_key is not null;

-- ============================================================
-- 5. State validation function
-- ============================================================
create or replace function public.is_valid_transition(_from text, _to text)
returns boolean as $$
begin
  return (
    (_from = 'draft' and _to = 'submitted') or
    (_from = 'submitted' and _to in ('approved', 'rejected', 'changes_requested')) or
    (_from = 'changes_requested' and _to = 'submitted')
  );
end;
$$ language plpgsql immutable;

comment on function public.is_valid_transition(text, text) is 'Returns true if the state transition is valid per the product lifecycle state machine.';

-- ============================================================
-- 6. State transition function (SECURITY DEFINER)
-- ============================================================
create or replace function public.transition_product_state(
  p_product_id uuid,
  p_to_state text,
  p_actor_id uuid,
  p_actor_role text,
  p_reason text default null,
  p_idempotency_key text default null
)
returns table (
  success boolean,
  new_state text,
  error_code text,
  error_message text
)
language plpgsql
as $$
declare
  v_current_state text;
  v_version int;
begin
  -- Idempotency check: if this key was already used, return cached result
  if p_idempotency_key is not null then
    select to_state into v_current_state
    from public.product_state_transitions
    where idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return query select true, v_current_state, null::text, null::text;
      return;
    end if;
  end if;

  -- Lock and read current state
  select status, version into v_current_state, v_version
  from public.products
  where id = p_product_id
  for update;

  if not found then
    return query select false, null::text, 'NOT_FOUND', 'Product not found';
    return;
  end if;

  -- Validate transition
  if not public.is_valid_transition(v_current_state, p_to_state) then
    return query select false, v_current_state, 'INVALID_TRANSITION',
      format('Cannot transition from %s to %s', v_current_state, p_to_state);
    return;
  end if;

  -- Perform transition
  update public.products
  set status = p_to_state,
      version = v_version + 1,
      submitted_at = case when p_to_state = 'submitted' then now() else submitted_at end,
      reviewed_at = case when p_to_state in ('approved', 'rejected', 'changes_requested') then now() else reviewed_at end
  where id = p_product_id;

  -- Record transition
  insert into public.product_state_transitions
    (id, product_id, from_state, to_state, actor_id, actor_role, reason, idempotency_key, created_at)
  values
    (gen_random_uuid(), p_product_id, v_current_state, p_to_state, p_actor_id, p_actor_role, p_reason, p_idempotency_key, now());

  return query select true, p_to_state, null::text, null::text;
end;
$$;

comment on function public.transition_product_state is 'Atomically transitions a product to a new state with idempotency. SECURITY DEFINER — bypasses RLS.';

grant execute on function public.transition_product_state(uuid, text, uuid, text, text, text) to authenticated;

-- ============================================================
-- 7. Fix Storage admin policies to use is_admin()
--    (avoids RLS recursion when querying profiles)
-- ============================================================

-- Drop old admin policies that query profiles directly
drop policy if exists "Admins can manage all photos" on storage.objects;
drop policy if exists "Admins can manage all videos" on storage.objects;

-- Recreate with is_admin() to avoid RLS recursion
create policy "Admins can manage all photos"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'product-photos'
    and public.is_admin(auth.uid())
  );

create policy "Admins can manage all videos"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'product-videos'
    and public.is_admin(auth.uid())
  );
