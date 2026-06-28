-- Database-level enforcement of plan limits (backs up the in-app gating).
--   • Talent: Starter capped at 50 active talent (Pro/Business/trial = unlimited)
--   • Team seats: Starter 2, Pro 5 (Business/trial = unlimited)
-- Reports is a UI feature gate, not a data boundary, so it needs no DB rule.
--
-- SECURITY DEFINER so the checks can read org plan + counts regardless of RLS.
-- NOTE: this project applies DB rules in the Supabase dashboard, not via auto
-- migrations. Paste this into the Supabase SQL Editor and Run it once.

-- ── Talent limit ───────────────────────────────────────────────────────────
create or replace function enforce_talent_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_plan  text;
  v_limit int;
  v_count int;
begin
  -- Only active talent counts; archived/other statuses are free.
  if NEW.status is distinct from 'active' then
    return NEW;
  end if;
  -- On UPDATE, skip if it was already active (no new slot consumed).
  if TG_OP = 'UPDATE' and OLD.status = 'active' then
    return NEW;
  end if;

  select stripe_plan into v_plan from public.organizations where id = NEW.org_id;
  v_limit := case v_plan when 'starter' then 50 else null end;  -- null = unlimited
  if v_limit is null then
    return NEW;
  end if;

  select count(*) into v_count
    from public.creators
   where org_id = NEW.org_id and status = 'active';

  if v_count >= v_limit then
    raise exception 'Talent limit reached for your plan (% max). Upgrade to add more.', v_limit
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_talent_limit on public.creators;
create trigger trg_enforce_talent_limit
  before insert or update on public.creators
  for each row execute function enforce_talent_limit();

-- ── Team seat limit ────────────────────────────────────────────────────────
create or replace function enforce_seat_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_plan  text;
  v_limit int;
  v_used  int;
begin
  select stripe_plan into v_plan from public.organizations where id = NEW.org_id;
  v_limit := case v_plan when 'starter' then 2 when 'pro' then 5 else null end;  -- null = unlimited
  if v_limit is null then
    return NEW;
  end if;

  -- Seats used = current members + outstanding (unaccepted) invitations.
  select (select count(*) from public.profiles    where org_id = NEW.org_id)
       + (select count(*) from public.invitations where org_id = NEW.org_id and accepted_at is null)
    into v_used;

  if v_used >= v_limit then
    raise exception 'Team seat limit reached for your plan (% max). Upgrade to add more.', v_limit
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_seat_limit on public.invitations;
create trigger trg_enforce_seat_limit
  before insert on public.invitations
  for each row execute function enforce_seat_limit();
