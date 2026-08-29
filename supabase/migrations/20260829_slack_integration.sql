-- Slack integration (Settings → Integrations), Pro & Business only.
--
-- WHAT IT DOES: a company connects one Slack Incoming Webhook, pointed at a
-- channel of their choosing (e.g. #hq). HQue then posts two things there:
--   • a task was assigned to someone
--   • a task is overdue
-- Each post @-tags the person it's about, if we know their Slack member ID.
--
-- WHY THE WEBHOOK NEVER TOUCHES THE BROWSER: an Incoming Webhook URL is a
-- bearer secret — anyone holding it can post into that channel forever. So this
-- table has RLS on with NO policies at all: the client can never read or write
-- it directly. Everything goes through the SECURITY DEFINER functions below
-- (which check role + plan) or the service-role Netlify functions that send.
--
-- NOTE: this project applies DB rules in the Supabase dashboard, not via auto
-- migrations. Paste this into the Supabase SQL Editor and Run it once.
-- Safe to re-run.

-- ── The connection ───────────────────────────────────────────────────────────
-- Keyed by (org, provider) so the next integration (Calendar, QuickBooks…)
-- slots in beside Slack instead of needing its own table.
create table if not exists public.org_integrations (
  org_id             uuid        not null references public.organizations(id) on delete cascade,
  provider           text        not null default 'slack',
  webhook_url        text        not null,
  channel_label      text,       -- what the admin typed, e.g. "#hq" — display only
  enabled            boolean     not null default true,
  notify_assignments boolean     not null default true,
  notify_overdue     boolean     not null default true,
  connected_by       uuid        references public.profiles(id) on delete set null,
  connected_at       timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (org_id, provider)
);

alter table public.org_integrations enable row level security;
-- Deliberately no policies: service role and the definer functions only.

-- ── Each member's Slack member ID ────────────────────────────────────────────
-- Per membership, not per profile: someone in two companies may be in two
-- different Slack workspaces, with a different ID in each.
alter table public.org_members add column if not exists slack_user_id text;

-- ── Helpers ──────────────────────────────────────────────────────────────────
-- Is the caller an owner/admin of this org?
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = 'public'
stable
as $function$
  select exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = auth.uid() and role in ('owner','admin')
  );
$function$;

revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- Does this org's plan include integrations? Mirrors planLimits() in src/plans.js:
-- Starter is the only plan without them. A null plan is a trial, and trials are
-- unrestricted, so they get integrations too.
create or replace function public.org_has_integrations(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = 'public'
stable
as $function$
  select coalesce(
    (select is_lifetime or stripe_plan is distinct from 'starter'
     from organizations where id = p_org_id),
    false);
$function$;

revoke all on function public.org_has_integrations(uuid) from public;
grant execute on function public.org_has_integrations(uuid) to authenticated;

-- ── Read the connection (never the secret) ───────────────────────────────────
-- Any member may see whether Slack is on and where it posts; only the last four
-- characters of the URL come back, purely so an admin can tell two webhooks
-- apart when re-checking their setup.
create or replace function public.slack_status(p_org_id uuid)
returns table (
  connected boolean, channel_label text, enabled boolean,
  notify_assignments boolean, notify_overdue boolean,
  connected_at timestamptz, url_hint text, plan_allows boolean
)
language plpgsql
security definer
set search_path = 'public'
stable
as $function$
begin
  if not exists (select 1 from org_members where org_id = p_org_id and user_id = auth.uid()) then
    raise exception 'Not a member of this organization';
  end if;

  return query
  select
    i.org_id is not null,
    i.channel_label,
    coalesce(i.enabled, true),
    coalesce(i.notify_assignments, true),
    coalesce(i.notify_overdue, true),
    i.connected_at,
    case when i.webhook_url is null then null else '…' || right(i.webhook_url, 4) end,
    public.org_has_integrations(p_org_id)
  from (select p_org_id as k) base
  left join org_integrations i on i.org_id = p_org_id and i.provider = 'slack';
end;
$function$;

revoke all on function public.slack_status(uuid) from public;
grant execute on function public.slack_status(uuid) to authenticated;

-- ── Connect / update ─────────────────────────────────────────────────────────
create or replace function public.slack_connect(p_org_id uuid, p_webhook_url text, p_channel_label text)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Only an owner or admin can connect an integration';
  end if;

  if not public.org_has_integrations(p_org_id) then
    raise exception 'Integrations are available on the Pro and Business plans';
  end if;

  -- Only a real Slack webhook. Stops this field being used to make the server
  -- POST anywhere else.
  if p_webhook_url is null or p_webhook_url !~ '^https://hooks\.slack\.com/services/[A-Za-z0-9/_-]+$' then
    raise exception 'That does not look like a Slack webhook URL. It should start with https://hooks.slack.com/services/';
  end if;

  insert into org_integrations (org_id, provider, webhook_url, channel_label, connected_by, connected_at, updated_at)
  values (p_org_id, 'slack', p_webhook_url, nullif(trim(p_channel_label), ''), auth.uid(), now(), now())
  on conflict (org_id, provider) do update
    set webhook_url   = excluded.webhook_url,
        channel_label = excluded.channel_label,
        enabled       = true,
        connected_by  = excluded.connected_by,
        connected_at  = now(),
        updated_at    = now();
end;
$function$;

revoke all on function public.slack_connect(uuid, text, text) from public;
grant execute on function public.slack_connect(uuid, text, text) to authenticated;

-- ── Which posts to send ──────────────────────────────────────────────────────
create or replace function public.slack_set_prefs(
  p_org_id uuid, p_enabled boolean, p_assignments boolean, p_overdue boolean)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Only an owner or admin can change integration settings';
  end if;

  update org_integrations
     set enabled            = coalesce(p_enabled, enabled),
         notify_assignments = coalesce(p_assignments, notify_assignments),
         notify_overdue     = coalesce(p_overdue, notify_overdue),
         updated_at         = now()
   where org_id = p_org_id and provider = 'slack';
end;
$function$;

revoke all on function public.slack_set_prefs(uuid, boolean, boolean, boolean) from public;
grant execute on function public.slack_set_prefs(uuid, boolean, boolean, boolean) to authenticated;

-- ── Disconnect ───────────────────────────────────────────────────────────────
-- Deletes the row outright rather than flagging it off, so the stored secret
-- goes away the moment they disconnect.
create or replace function public.slack_disconnect(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Only an owner or admin can disconnect an integration';
  end if;

  delete from org_integrations where org_id = p_org_id and provider = 'slack';
end;
$function$;

revoke all on function public.slack_disconnect(uuid) from public;
grant execute on function public.slack_disconnect(uuid) to authenticated;

-- ── The roster, with each member's Slack ID ──────────────────────────────────
create or replace function public.org_team_slack(p_org_id uuid)
returns table (id uuid, email text, full_name text, avatar_url text, role text, slack_user_id text)
language sql
security definer
set search_path = 'public'
stable
as $function$
  select p.id, p.email, p.full_name, p.avatar_url, m.role, m.slack_user_id
  from org_members m
  join profiles p on p.id = m.user_id
  where m.org_id = p_org_id
    and public.is_org_admin(p_org_id)
  order by m.created_at asc;
$function$;

revoke all on function public.org_team_slack(uuid) from public;
grant execute on function public.org_team_slack(uuid) to authenticated;

-- ── Set one member's Slack ID ────────────────────────────────────────────────
-- An owner/admin can set anyone's; anyone can set their own.
create or replace function public.set_slack_user_id(p_org_id uuid, p_user_id uuid, p_slack_user_id text)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_clean text := upper(trim(coalesce(p_slack_user_id, '')));
begin
  if p_user_id <> auth.uid() and not public.is_org_admin(p_org_id) then
    raise exception 'Only an owner or admin can set another member''s Slack ID';
  end if;

  -- Slack member IDs look like U04AB12CD (or W… on Enterprise Grid). Blank clears it.
  if v_clean <> '' and v_clean !~ '^[UW][A-Z0-9]{6,}$' then
    raise exception 'That does not look like a Slack member ID. It should look like U04AB12CD.';
  end if;

  update org_members
     set slack_user_id = nullif(v_clean, '')
   where org_id = p_org_id and user_id = p_user_id;
end;
$function$;

revoke all on function public.set_slack_user_id(uuid, uuid, text) from public;
grant execute on function public.set_slack_user_id(uuid, uuid, text) to authenticated;
