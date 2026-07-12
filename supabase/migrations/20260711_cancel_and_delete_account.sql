-- Cancel plan + delete account (owner-only).
--
-- Phase 1 (cancel): organizations.cancel_at remembers that a subscription is set
-- to end at the end of the paid period, so Billing can say "your plan ends on X"
-- and offer Resume. Cleared when they resume, or when the plan actually ends.
--
-- Phase 2 (delete): a deletion is a 30-day grace period, not an instant wipe.
--   deleted_at   — when the owner asked for deletion (workspace locks immediately)
--   purge_after  — when the nightly job permanently wipes it
--   deleted_by   — who asked (audit)
-- Restoring within the window simply clears all three.

alter table public.organizations
  add column if not exists cancel_at   timestamptz,
  add column if not exists deleted_at  timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists deleted_by  uuid references auth.users(id) on delete set null;

create index if not exists organizations_purge_after_idx
  on public.organizations (purge_after) where purge_after is not null;

-- Close the workspace: 30-day grace, then permanent deletion.
-- Owner-only, and the master/platform account can never be deleted.
create or replace function request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_role text;
  v_name text;
  v_purge timestamptz;
begin
  select org_id, role into v_org, v_role from profiles where id = auth.uid();

  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'no_workspace');
  end if;
  if v_role is distinct from 'owner' then
    return jsonb_build_object('ok', false, 'reason', 'not_owner');
  end if;
  -- Never let the platform's own account be deleted.
  if exists (select 1 from platform_admins pa join profiles p on p.id = pa.user_id where p.org_id = v_org) then
    return jsonb_build_object('ok', false, 'reason', 'master_account');
  end if;

  v_purge := now() + interval '30 days';

  update organizations
     set deleted_at  = now(),
         purge_after = v_purge,
         deleted_by  = auth.uid()
   where id = v_org
   returning name into v_name;

  return jsonb_build_object('ok', true, 'org_name', v_name, 'purge_after', v_purge);
end;
$$;

-- Undo a deletion during the grace period. Owner-only.
-- Note this does NOT resurrect the Stripe subscription — deletion cancels it, so
-- a restored workspace lands on the upgrade wall until they pick a plan again.
create or replace function restore_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_role text;
begin
  select org_id, role into v_org, v_role from profiles where id = auth.uid();

  if v_org is null then
    return jsonb_build_object('ok', false, 'reason', 'no_workspace');
  end if;
  if v_role is distinct from 'owner' then
    return jsonb_build_object('ok', false, 'reason', 'not_owner');
  end if;

  update organizations
     set deleted_at = null, purge_after = null, deleted_by = null
   where id = v_org and purge_after > now();

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'too_late');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function request_account_deletion() from public, anon;
revoke all on function restore_account() from public, anon;
grant execute on function request_account_deletion() to authenticated;
grant execute on function restore_account() to authenticated;

-- ---------------------------------------------------------------------------
-- The permanent wipe. Called once a day by the purge-accounts scheduled
-- function (service key only — never exposed to the app).
--
-- Order matters. Most tables point at organizations with NO ACTION, so a plain
-- "delete from organizations" fails on a foreign-key violation. We delete the
-- org-scoped tables ourselves, leaning on the cascades that DO exist:
--   tasks      → task_comments, task_attachments, task_assignees, task_watchers
--   brands     → brand_contacts, brand_notes_views, user_brand_pins
--   campaigns  → campaign_comments, campaign_creators
--   boards     → board_columns
-- AppSumo codes are NOT deleted: the code stays marked redeemed (so it can't be
-- reused) and we just detach it from the org that's going away.
create or replace function purge_expired_accounts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     record;
  v_users   uuid[];
  v_purged  int := 0;
  v_names   text[] := '{}';
begin
  for v_org in
    select id, name from organizations
     where purge_after is not null and purge_after <= now()
  loop
    -- Belt and braces: never wipe the platform's own account.
    if exists (
      select 1 from platform_admins pa join profiles p on p.id = pa.user_id
       where p.org_id = v_org.id
    ) then
      continue;
    end if;

    select coalesce(array_agg(id), '{}') into v_users from profiles where org_id = v_org.id;

    delete from task_attachments where org_id = v_org.id;
    delete from tasks            where org_id = v_org.id;
    delete from campaigns        where org_id = v_org.id;
    delete from boards           where org_id = v_org.id;
    delete from creators         where org_id = v_org.id;
    delete from brand_contacts   where org_id = v_org.id;
    delete from brands           where org_id = v_org.id;
    delete from outreach_logs    where org_id = v_org.id;
    delete from talent_inquiries where org_id = v_org.id;
    delete from notifications    where org_id = v_org.id;
    delete from org_settings     where org_id = v_org.id;
    delete from invitations      where org_id = v_org.id;

    update appsumo_codes set redeemed_by = null where redeemed_by = v_org.id;

    delete from profiles     where org_id = v_org.id;
    delete from auth.users   where id = any(v_users);
    delete from organizations where id = v_org.id;

    v_purged := v_purged + 1;
    v_names  := v_names || v_org.name;
  end loop;

  return jsonb_build_object('ok', true, 'purged', v_purged, 'names', v_names);
end;
$$;

-- Service key only. No app user, and certainly no anon visitor, may call this.
revoke all on function purge_expired_accounts() from public, anon, authenticated;
