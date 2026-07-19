-- Talent manager + richer public profile.
--
--  1. Each talent can be assigned to a team member (their manager / point of
--     contact). Booking inquiries from the public profile go to this person;
--     if unset, they fall back to the account's admin team (owner + admins).
--  2. The public profile (get_public_creator) now also exposes location, social
--     handles, and per-platform follower counts — so the /talent/<slug> page can
--     show stats and social links. Rates, contact/manager emails, internal
--     notes, and engagement stay private (still not selected here).
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

-- 1. Assigned manager (a team member). Null = falls back to the admin team.
alter table public.creators
  add column if not exists manager_user_id uuid references public.profiles(id) on delete set null;

-- 2. Expose the extra public fields.
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
    'photo_url', photo_url,
    'location', location,
    'handles', handles,
    'ig_followers', ig_followers,
    'tiktok_followers', tiktok_followers,
    'yt_subscribers', yt_subscribers
  )
  from public.creators
  where slug = p_slug
    and public_enabled = true
    and status = 'active'
  limit 1;
$$;
grant execute on function public.get_public_creator(text) to anon, authenticated;
