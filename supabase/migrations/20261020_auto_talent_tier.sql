-- Talent tier is set automatically from combined followers
-- (Instagram + TikTok + YouTube), for every company, no matter which screen or
-- import saves the record. Talent with no follower numbers keep whatever tier
-- was picked by hand.
--
-- Cutoffs (each is the floor for that tier): Mega 1M, Macro 200K, Mid 100K,
-- Micro 25K, anything below is Nano. Keep in sync with TIER_FLOORS in
-- src/AddCreatorForm.jsx.

create or replace function public.talent_tier_for(p_ig int, p_tiktok int, p_yt int)
returns text language sql immutable as $$
  select case
    when t = 0 then null
    when t >= 1000000 then 'Mega'
    when t >= 200000 then 'Macro'
    when t >= 100000 then 'Mid'
    when t >= 25000 then 'Micro'
    else 'Nano'
  end
  from (select coalesce(p_ig, 0)::bigint + coalesce(p_tiktok, 0) + coalesce(p_yt, 0) as t) s
$$;

create or replace function public.set_talent_tier()
returns trigger language plpgsql as $$
declare v_tier text;
begin
  v_tier := public.talent_tier_for(NEW.ig_followers, NEW.tiktok_followers, NEW.yt_subscribers);
  if v_tier is not null then NEW.tier := v_tier; end if;
  return NEW;
end; $$;

drop trigger if exists trg_set_talent_tier on public.creators;
create trigger trg_set_talent_tier
  before insert or update of ig_followers, tiktok_followers, yt_subscribers, tier on public.creators
  for each row execute function public.set_talent_tier();

-- One-time re-tier of existing talent. Old tiers are kept in a backup table so
-- the change can be undone:
--   update creators c set tier = b.old_tier from creators_tier_backup_20261020 b where b.id = c.id;
-- (disable trg_set_talent_tier first, or the trigger re-applies the rule)
create table if not exists public.creators_tier_backup_20261020 as
  select id, org_id, tier as old_tier, now() as saved_at from public.creators;
alter table public.creators_tier_backup_20261020 enable row level security;

update public.creators
set tier = public.talent_tier_for(ig_followers, tiktok_followers, yt_subscribers)
where public.talent_tier_for(ig_followers, tiktok_followers, yt_subscribers) is not null
  and tier is distinct from public.talent_tier_for(ig_followers, tiktok_followers, yt_subscribers);
