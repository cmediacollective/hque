-- Which company does a deep-linked task or campaign belong to?
--
-- Task links in notification emails now carry their company (?org=<id>), so the
-- app can switch to it before opening. Links sent BEFORE that shipped carry no
-- company at all, and they don't expire — every one of them still lands the
-- reader in whatever company they last had open, where the item is invisible.
-- The same goes for any task link pasted into Slack or a doc back then.
--
-- This answers the question directly instead of relying on the link to say:
-- given a task or campaign id, return the company it lives in. The app calls it
-- when a link arrives without one, and switches if it isn't the active company.
--
-- SECURITY DEFINER so it can read past RLS (RLS scopes reads to the ACTIVE
-- company, which is exactly the company you're NOT in when this matters). It
-- answers only for companies the caller actually belongs to, so it can't be used
-- to discover anything about a workspace you were never invited to — an id from
-- someone else's company returns null, the same as an id that doesn't exist.
--
-- NOTE: this project applies DB rules in the Supabase dashboard, not via auto
-- migrations. Paste this into the Supabase SQL Editor and Run it once.
-- Safe to re-run (create or replace).

create or replace function public.org_for_deep_link(
  p_task_id uuid default null,
  p_campaign_id uuid default null
)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select item.org_id
  from (
    select t.org_id
    from public.tasks t
    where p_task_id is not null and t.id = p_task_id
    union all
    select c.org_id
    from public.campaigns c
    where p_campaign_id is not null and c.id = p_campaign_id
  ) item
  where exists (
    select 1
    from public.org_members m
    where m.user_id = auth.uid()
      and m.org_id = item.org_id
  )
  limit 1;
$$;

revoke all on function public.org_for_deep_link(uuid, uuid) from public;
grant execute on function public.org_for_deep_link(uuid, uuid) to authenticated;
