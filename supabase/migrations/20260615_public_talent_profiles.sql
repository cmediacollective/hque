-- Public, shareable talent profile pages (h-que.com/talent/<slug>).
--
-- Adds a public bio, a URL slug, and a published on/off flag to creators,
-- plus a read-only function that lets logged-OUT visitors fetch ONLY the
-- safe public fields, and ONLY for talent the agency has published.
--
-- Rates, contact emails, manager info, internal notes, follower counts and
-- engagement are NEVER exposed by this function.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run.

-- 1. New columns on creators.
alter table public.creators add column if not exists bio text;
alter table public.creators add column if not exists slug text;
alter table public.creators add column if not exists public_enabled boolean not null default false;

-- 2. Slugs must be globally unique (only enforced once a slug is actually set),
--    so the app can claim "piper-jones", then "piper-jones-2", etc.
create unique index if not exists creators_slug_unique
  on public.creators (slug) where slug is not null;

-- 3. Public read function. SECURITY DEFINER so it can bypass row-level security,
--    but it hand-picks the columns returned and only ever returns a published,
--    active profile — so nothing private can leak.
create or replace function public.get_public_creator(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', name,
    'type', type,
    'types', types,
    'niches', niches,
    'bio', bio,
    'photo_url', photo_url
  )
  from public.creators
  where slug = p_slug
    and public_enabled = true
    and status = 'active'
  limit 1;
$$;

-- 4. Let anonymous (logged-out) visitors call it.
grant execute on function public.get_public_creator(text) to anon, authenticated;
