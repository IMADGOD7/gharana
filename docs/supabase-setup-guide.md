# PandaVerse Gharana Partner Portal — Supabase Setup Guide

## Overview

This guide walks you through setting up a Supabase project for the PandaVerse Gharana Partner Portal. It covers database initialization, authentication configuration, and media storage setup.

## Prerequisites

- A Supabase account (free tier works for development)
- Node.js 18+ and npm installed
- Git installed

---

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com) and sign in
2. Click **"New Project"**
3. Enter a project name (e.g., "pandaverse-gharana")
4. Enter a database password (save this securely)
5. Select a region close to your users
6. Click **"Create new project"**
7. Wait for the project to initialize (~2 minutes)

---

## Step 2: Run Database Migrations

1. In your Supabase project dashboard, go to **SQL Editor**
2. Run the following migrations in order:

### Migration 1: Initial Schema (Full Schema + RLS)

```sql
-- ============================================================
-- PandaVerse Gharana Partner Portal — Database Schema
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'partner' check (role in ('partner', 'admin')),
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Partners view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Partners update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins view all profiles"
  on public.profiles for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Partner Profiles
create table if not exists public.partner_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  brand_name text not null default '',
  website text,
  location text,
  about text,
  specialties text[] default '{}',
  years_active integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.partner_profiles enable row level security;

create policy "Partners view own partner profile"
  on public.partner_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "Partners update own partner profile"
  on public.partner_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins view all partner profiles"
  on public.partner_profiles for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Products
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid references public.partner_profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  category text,
  tags text[] default '{}',
  price_min numeric,
  price_max numeric,
  currency text default 'INR',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested')),
  submitted_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.products enable row level security;

create policy "Partners view own products"
  on public.products for select
  to authenticated
  using (exists (
    select 1 from public.partner_profiles
    where partner_profiles.id = products.partner_id
    and partner_profiles.user_id = auth.uid()
  ));

create policy "Partners insert own products"
  on public.products for insert
  to authenticated
  with check (exists (
    select 1 from public.partner_profiles
    where partner_profiles.id = products.partner_id
    and partner_profiles.user_id = auth.uid()
  ));

create policy "Partners update own draft products"
  on public.products for update
  to authenticated
  using (
    exists (
      select 1 from public.partner_profiles
      where partner_profiles.id = products.partner_id
      and partner_profiles.user_id = auth.uid()
    )
    and status in ('draft', 'changes_requested')
  )
  with check (
    exists (
      select 1 from public.partner_profiles
      where partner_profiles.id = products.partner_id
      and partner_profiles.user_id = auth.uid()
    )
    and status in ('draft', 'changes_requested')
  );

create policy "Partners delete own draft products"
  on public.products for delete
  to authenticated
  using (
    exists (
      select 1 from public.partner_profiles
      where partner_profiles.id = products.partner_id
      and partner_profiles.user_id = auth.uid()
    )
    and status = 'draft'
  );

create policy "Admins view all products"
  on public.products for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins update all products"
  on public.products for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Product Stories
create table if not exists public.product_stories (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null unique,
  inspiration text,
  crafting_process text,
  cultural_context text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.product_stories enable row level security;

create policy "Partners manage own product stories"
  on public.product_stories for all
  to authenticated
  using (exists (
    select 1 from public.products
    join public.partner_profiles on products.partner_id = partner_profiles.id
    where products.id = product_stories.product_id
    and partner_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.products
    join public.partner_profiles on products.partner_id = partner_profiles.id
    where products.id = product_stories.product_id
    and partner_profiles.user_id = auth.uid()
  ));

create policy "Admins view all product stories"
  on public.product_stories for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Makers
create table if not exists public.makers (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null,
  name text not null,
  bio text,
  craft_technique text not null,
  years_of_experience integer,
  location text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.makers enable row level security;

create policy "Partners manage own product makers"
  on public.makers for all
  to authenticated
  using (exists (
    select 1 from public.products
    join public.partner_profiles on products.partner_id = partner_profiles.id
    where products.id = makers.product_id
    and partner_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.products
    join public.partner_profiles on products.partner_id = partner_profiles.id
    where products.id = makers.product_id
    and partner_profiles.user_id = auth.uid()
  ));

create policy "Admins view all makers"
  on public.makers for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Product Media
create table if not exists public.product_media (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.product_media enable row level security;

create policy "Partners manage own product media"
  on public.product_media for all
  to authenticated
  using (exists (
    select 1 from public.products
    join public.partner_profiles on products.partner_id = partner_profiles.id
    where products.id = product_media.product_id
    and partner_profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.products
    join public.partner_profiles on products.partner_id = partner_profiles.id
    where products.id = product_media.product_id
    and partner_profiles.user_id = auth.uid()
  ));

create policy "Admins view all product media"
  on public.product_media for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Public view approved product media"
  on public.product_media for select
  to anon
  using (exists (
    select 1 from public.products
    where products.id = product_media.product_id
    and products.status = 'approved'
  ));

-- Review Notes
create table if not exists public.review_notes (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('approve', 'reject', 'request_changes')),
  notes text,
  created_at timestamptz default now() not null
);

alter table public.review_notes enable row level security;

create policy "Admins insert review notes"
  on public.review_notes for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    and reviewer_id = auth.uid()
  );

create policy "Admins view all review notes"
  on public.review_notes for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Indexes for performance
create index if not exists idx_products_partner_id on public.products(partner_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_product_stories_product_id on public.product_stories(product_id);
create index if not exists idx_makers_product_id on public.makers(product_id);
create index if not exists idx_product_media_product_id on public.product_media(product_id);
create index if not exists idx_product_media_sort_order on public.product_media(product_id, sort_order);
create index if not exists idx_review_notes_product_id on public.review_notes(product_id);
```

### Migration 2: Auth Callback Function

This creates the `profiles` and `partner_profiles` rows automatically when a new user signs up.

```sql
-- ============================================================
-- Auth Callback — Auto-create profile and partner profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'partner')
  on conflict (id) do nothing;

  insert into public.partner_profiles (user_id, brand_name)
  values (new.id, '')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Migration 3: Demo Admin Account

```sql
-- ============================================================
-- Demo Admin Account
-- ============================================================
-- IMPORTANT: Replace the email with your actual email, then run the password
-- reset flow from the Supabase Auth dashboard to set the password.

-- First, sign up via the /signup page with your email, then run this:
insert into public.profiles (id, email, full_name, role)
values (
  (select id from auth.users where email = 'YOUR_EMAIL@example.com'),
  'YOUR_EMAIL@example.com',
  'Admin User',
  'admin'
)
on conflict (id) do update set role = 'admin';
```

---

## Step 3: Configure Supabase Storage

1. In your Supabase project, go to **Storage**
2. Create a bucket named `product-images` (public)
3. Create a bucket named `product-videos` (public)
4. Go to **Storage Policies** and add the following policies for each bucket:

### product-images policies:

```sql
-- Partners can upload to their own folder
create policy "Partners upload own images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Partners can view their own images
create policy "Partners view own images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Partners can delete their own images
create policy "Partners delete own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can do everything
create policy "Admins manage all images"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Public can view approved product images
create policy "Public view approved images"
  on storage.objects for select
  to anon
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.products
      where products.id = (storage.foldername(name))[2]::uuid
      and products.status = 'approved'
    )
  );
```

### product-videos policies:

(Repeat the same as above but for `bucket_id = 'product-videos'`)

### Public read for approved products:

```sql
create policy "Public view approved videos"
  on storage.objects for select
  to anon
  using (
    bucket_id = 'product-videos'
    and exists (
      select 1 from public.products
      where products.id = (storage.foldername(name))[2]::uuid
      and products.status = 'approved'
    )
  );
```

---

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. In your Supabase project dashboard, go to **Settings > API**
3. Copy the following values to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> **Security Note:** The `SUPABASE_SERVICE_ROLE_KEY` is only used in server-side code (API routes, server actions). It bypasses RLS, so never expose it to the client.

---

## Step 5: Enable Email Authentication

1. In Supabase dashboard, go to **Authentication > Providers**
2. Ensure **Email** provider is enabled
3. Configure **Email Templates** if you want custom emails
4. Optionally disable "Confirm email" for development (not recommended for production)

---

## Step 6: Seed Demo Data (Optional)

Run the following SQL in the SQL Editor to create a demo partner:

```sql
-- Create a demo partner user
-- (Use the Auth Users UI to create the user first, then run this)

-- Get the user ID from auth.users after creation, then:
insert into public.partner_profiles (user_id, brand_name, location, about)
values (
  'USER_UUID_HERE',
  'Kalamkari Artisans',
  'Srikalahasti, Andhra Pradesh',
  'Traditional Kalamkari hand-painting artisans preserving a 3000-year-old craft.'
);
```

---

## Step 7: Verify Setup

1. Start the development server:
```bash
npm run dev
```

2. Visit `http://localhost:3000`
3. Sign up a new account
4. Verify the signup creates both `profiles` and `partner_profiles` rows
5. Create a test product
6. Verify product appears in the dashboard

---

## Troubleshooting

### "Row Level Security policy violation"
- Check that RLS policies are correctly set up
- Verify the authenticated user's UUID matches the expected IDs

### "Storage permission denied"
- Check storage policies are correct
- Verify bucket names match exactly

### "Profile not found" after signup
- Check the auth callback trigger exists: `select * from pg_trigger where tgname = 'on_auth_user_created'`
- Manually create the profile if needed

### "Failed to load SWC binary"
- On Linux WSL, run: `npm install @next/swc-linux-x64-gnu`
- Or run: `npm install --save-dev @next/swc-linux-x64-musl`

---

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Service role key not exposed to client
- [ ] Storage policies restrict uploads to authenticated users
- [ ] Email authentication enabled
- [ ] No hardcoded credentials in code
- [ ] `.env.local` is in `.gitignore`
- [ ] HTTPS enabled in production
