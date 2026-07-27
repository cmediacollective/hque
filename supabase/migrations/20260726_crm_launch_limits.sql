-- CRM launch — raise the per-plan contact caps to the public-launch numbers.
--   Starter 1,000 · Pro 10,000 · Business/trial/lifetime unlimited.
-- (Replaces the preview caps of 500 / 5,000.) Only stored contacts count —
-- talent, their managers, and companies are pulled in live and never counted.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run.

create or replace function enforce_contacts_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_plan  text;
  v_limit int;
  v_count int;
begin
  select stripe_plan into v_plan from public.organizations where id = NEW.org_id;
  v_limit := case v_plan when 'starter' then 1000 when 'pro' then 10000 else null end; -- null = unlimited
  if v_limit is null then
    return NEW;
  end if;

  select count(*) into v_count
    from public.brand_contacts
   where org_id = NEW.org_id;

  if v_count >= v_limit then
    raise exception 'Contact limit reached for your plan (% max). Upgrade to add more.', v_limit
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;
