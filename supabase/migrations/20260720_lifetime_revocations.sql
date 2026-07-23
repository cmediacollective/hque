-- Revocation history for comped/lifetime accounts.
--
-- Until now, revoking an account was invisible: list_comped_accounts() only
-- returns orgs where is_lifetime = true, so a revoked account simply vanished
-- from Settings → Comps with no record that it ever existed. This adds an
-- append-only log so you can answer "who have I revoked, and when".
--
-- A separate table (rather than a revoked_at column on organizations) keeps the
-- full history: if someone is granted access again and later revoked again,
-- both events survive instead of the second overwriting the first.

create table if not exists lifetime_revocations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  org_name    text,
  owner_email text,
  source      text,          -- 'AppSumo' or 'Comp', as it was at revoke time
  plan        text,          -- plan they held when revoked
  reason      text,          -- optional free-text note
  revoked_by  uuid,          -- auth.users.id of the admin who did it (null = backfilled)
  revoked_at  timestamptz not null default now()
);

create index if not exists lifetime_revocations_org_idx on lifetime_revocations(org_id);
create index if not exists lifetime_revocations_at_idx on lifetime_revocations(revoked_at desc);

-- Same posture as appsumo_codes: RLS on with no policies, so anon/authenticated
-- keys can never read it directly. All access goes through the SECURITY DEFINER
-- RPCs below, which check is_platform_admin() first.
alter table lifetime_revocations enable row level security;

-- ---------------------------------------------------------------------
-- Replace revoke_lifetime_access so it logs.
--
-- The old signature was revoke_lifetime_access(uuid). Adding a defaulted second
-- parameter would create an overload rather than replace it, and a one-argument
-- call would then be ambiguous — so drop the old one explicitly first.
-- ---------------------------------------------------------------------
drop function if exists revoke_lifetime_access(uuid);

create or replace function revoke_lifetime_access(p_org uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name  text;
  v_email text;
  v_plan  text;
  v_src   text;
begin
  if not is_platform_admin() then
    raise exception 'not_authorized';
  end if;

  -- Snapshot who they were BEFORE the update clears the plan, so the log keeps
  -- what they actually had rather than the post-revoke nulls.
  select o.name::text, o.stripe_plan::text,
         (select u.email::text
            from profiles p
            join auth.users u on u.id = p.id
           where p.org_id = o.id
           order by (p.role = 'owner') desc nulls last
           limit 1),
         (case when exists (select 1 from appsumo_codes c where c.redeemed_by = o.id)
               then 'AppSumo' else 'Comp' end)
    into v_name, v_plan, v_email, v_src
    from organizations o
   where o.id = p_org;

  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  update organizations
     set is_lifetime         = false,
         stripe_plan         = null,
         subscription_status = null,
         trial_ends_at       = now() - interval '1 minute',
         past_due_since      = null
   where id = p_org;

  insert into lifetime_revocations (org_id, org_name, owner_email, source, plan, reason, revoked_by)
  values (p_org, v_name, v_email, v_src, v_plan, nullif(btrim(coalesce(p_reason, '')), ''), auth.uid());

  return jsonb_build_object('ok', true, 'org_name', v_name);
end;
$$;

revoke all on function revoke_lifetime_access(uuid, text) from public, anon;
grant execute on function revoke_lifetime_access(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Read the log, newest first.
-- ---------------------------------------------------------------------
create or replace function list_revoked_accounts()
returns table(
  id uuid, org_id uuid, org_name text, owner_email text,
  source text, plan text, reason text, revoked_at timestamptz, currently_lifetime boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'not_authorized';
  end if;

  return query
  select r.id, r.org_id, r.org_name, r.owner_email, r.source, r.plan, r.reason, r.revoked_at,
         -- true = they've since been granted access again, so this row is history,
         -- not their current state.
         coalesce((select o.is_lifetime from organizations o where o.id = r.org_id), false)
  from lifetime_revocations r
  order by r.revoked_at desc;
end;
$$;

revoke all on function list_revoked_accounts() from public, anon;
grant execute on function list_revoked_accounts() to authenticated;

-- ---------------------------------------------------------------------
-- Backfill: Quintessential Leverage, revoked 2026-07-20 via the Comps panel
-- before this log existed. revoked_by is null because it wasn't captured at the
-- time. Plan recorded as 'pro' — redeem-appsumo.js always sets that on redemption.
-- Guarded so re-running the migration can't duplicate it.
-- ---------------------------------------------------------------------
insert into lifetime_revocations (org_id, org_name, source, plan, reason, revoked_at)
select '5ca5d006-77ef-4e98-821a-ac2035640ceb', 'Quintessential Leverage', 'AppSumo', 'pro',
       'Backfilled — revoked before revocation logging existed (AppSumo code HQUE-SAXT-9W3Q-HMXE)',
       timestamptz '2026-07-20 00:00:00+00'
where not exists (
  select 1 from lifetime_revocations
   where org_id = '5ca5d006-77ef-4e98-821a-ac2035640ceb'
);
