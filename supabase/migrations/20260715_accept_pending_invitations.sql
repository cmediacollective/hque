-- Multi-company Phase 3: stack invitations instead of blocking them.
--
-- The old accept_invitation() bailed out the moment a user already belonged to
-- an org ("already attached? nothing to do") — so an existing user invited by a
-- second company never got attached to it. This replacement turns EVERY pending
-- invitation for the user's email into a membership (org_members row), so extra
-- companies simply appear in their switcher. It only sets the ACTIVE company
-- (profiles.org_id/role) when the user doesn't have one yet — preserving the
-- original first-signup behavior of landing a brand-new invited user in the
-- inviting company.
--
-- Called on every login (see fetchProfile in App.jsx). Idempotent: invites are
-- marked accepted, and org_members inserts are on-conflict-do-nothing, so
-- re-running does nothing.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

create or replace function public.accept_pending_invitations()
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_email    text := lower(auth.jwt() ->> 'email');
  v_uid      uuid := auth.uid();
  v_existing uuid;
  v_landing  uuid;
  v_role     text;
  r          record;
begin
  if v_uid is null or v_email is null then
    return null;
  end if;

  -- Need the profile row to exist before we can attach memberships to it.
  select org_id into v_existing from profiles where id = v_uid;
  if not found then
    return null;
  end if;

  -- Turn every pending invite for this email into a membership.
  for r in
    select id, org_id, coalesce(role, 'member') as role
    from invitations
    where lower(email) = v_email and accepted_at is null
    order by created_at desc
  loop
    insert into org_members (user_id, org_id, role)
    values (v_uid, r.org_id, r.role)
    on conflict (user_id, org_id) do nothing;

    update invitations set accepted_at = now() where id = r.id;

    -- Remember the most-recent invite's org as the landing spot for a user who
    -- has no active company yet.
    if v_landing is null then
      v_landing := r.org_id;
      v_role := r.role;
    end if;
  end loop;

  -- Brand-new user with no company yet: land them in the inviting company,
  -- exactly like the old accept_invitation did.
  if v_existing is null and v_landing is not null then
    update profiles set org_id = v_landing, role = v_role where id = v_uid;
    return v_landing;
  end if;

  -- Existing user: active company unchanged; the new company/companies now show
  -- up in their switcher.
  return v_existing;
end;
$function$;

revoke all on function public.accept_pending_invitations() from public;
grant execute on function public.accept_pending_invitations() to authenticated;
