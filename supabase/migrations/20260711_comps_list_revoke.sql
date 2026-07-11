-- Master-admin "Comps" panel (Settings → Comps) — list + revoke.
-- Companion to grant_lifetime_business() from 20260711_grant_lifetime_business.sql.
-- Both are SECURITY DEFINER and refuse unless the caller is a platform admin.

-- List everyone who currently has comped/lifetime access, with the owner's email
-- and where it came from ('AppSumo' = redeemed a code, 'Comp' = granted by you).
create or replace function list_comped_accounts()
returns table(org_id uuid, org_name text, plan text, owner_email text, source text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'not_authorized';
  end if;

  -- Explicit ::text casts: auth.users.email (and some org columns) are varchar,
  -- and a RETURNS TABLE function requires the query's types to match exactly.
  return query
  select
    o.id,
    o.name::text,
    o.stripe_plan::text,
    (select u.email::text
       from profiles p
       join auth.users u on u.id = p.id
      where p.org_id = o.id
      order by (p.role = 'owner') desc nulls last
      limit 1) as owner_email,
    (case when exists (select 1 from appsumo_codes c where c.redeemed_by = o.id)
          then 'AppSumo' else 'Comp' end)::text as source
  from organizations o
  where o.is_lifetime = true
  order by o.name;
end;
$$;

revoke all on function list_comped_accounts() from public, anon;
grant execute on function list_comped_accounts() to authenticated;

-- Revoke free access: clears the lifetime flag and plan, and expires the account
-- immediately (trial_ends_at in the past) so the app shows the upgrade wall until
-- they subscribe. Identified by org id (from the list above).
create or replace function revoke_lifetime_access(p_org uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not is_platform_admin() then
    raise exception 'not_authorized';
  end if;

  update organizations
     set is_lifetime         = false,
         stripe_plan         = null,
         subscription_status = null,
         trial_ends_at       = now() - interval '1 minute',
         past_due_since      = null
   where id = p_org
   returning name into v_name;

  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'org_name', v_name);
end;
$$;

revoke all on function revoke_lifetime_access(uuid) from public, anon;
grant execute on function revoke_lifetime_access(uuid) to authenticated;
