-- Master-admin tool: grant permanent, free Business access to an account by email.
--
-- Called from the HQ Metrics dashboard (src/GrantLifetimeAccess.jsx) as
--   supabase.rpc('grant_lifetime_business', { p_email })
-- using the logged-in master admin's session.
--
-- SECURITY DEFINER so it can read auth.users and bypass RLS on organizations —
-- but it refuses to do anything unless the caller is a platform admin
-- (is_platform_admin(), defined in 20260627_master_admin.sql). It flips the
-- person's org to the Business tier (stored internally as 'agency') and sets
-- is_lifetime = true, which permanently protects the account from any Stripe
-- downgrade and removes trial expiry. Works whether the person is mid-trial or
-- brand new (they just need an account + workspace first).
--
-- Returns jsonb:
--   { ok: true,  org_name }                    -- granted
--   { ok: false, reason: 'no_user' }           -- email never signed up
--   { ok: false, reason: 'no_workspace' }      -- signed up, no org yet
-- and raises 'not_authorized' if the caller is not a platform admin.

create or replace function grant_lifetime_business(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid;
  v_org  uuid;
  v_name text;
begin
  if not is_platform_admin() then
    raise exception 'not_authorized';
  end if;

  select id into v_uid
  from auth.users
  where lower(email) = lower(btrim(p_email))
  limit 1;

  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_user');
  end if;

  select org_id into v_org from profiles where id = v_uid;

  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'no_workspace');
  end if;

  update organizations
     set stripe_plan         = 'agency',   -- 'agency' is the Business tier
         is_lifetime         = true,       -- permanent; never downgraded/billed
         subscription_status = 'active',
         trial_ends_at       = null,       -- removes trial-expiry paywall
         past_due_since      = null
   where id = v_org
   returning name into v_name;

  return jsonb_build_object('ok', true, 'org_name', v_name);
end;
$$;

revoke all on function grant_lifetime_business(text) from public, anon;
grant execute on function grant_lifetime_business(text) to authenticated;
