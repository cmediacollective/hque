-- Row-level rules for tasks, boards, board_columns and profiles.
--
-- These four tables were the only ones not scoped to company membership; every
-- other table in the schema already was. This brings them into line, so a row
-- is reachable only by someone who belongs to the company that owns it.
--
--   tasks / boards   — scoped by org_id to the caller's memberships
--   board_columns    — inherit from their board
--   profiles         — yourself, plus people you share a company with;
--                      writable only by yourself
--
-- Existing policies on these four are dropped first, so the end state is
-- exactly what's written here and no earlier permissive rule survives beneath.
--
-- WHAT IS UNAFFECTED:
--   • Netlify background jobs (reminders, Slack, Stripe, metrics) use the
--     service key, which RLS does not apply to.
--   • org_team, accept_pending_invitations, my_organizations, switch_org,
--     delete_brand, spawn_repeat_task and the other SECURITY DEFINER functions
--     run as their owner.
--   • Checked against every screen that reads these tables: the board, My Tasks,
--     the brands sidebar, campaigns, Settings, and the billing gates that look
--     up the account owner's name.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

-- ── Start from a known state ─────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('tasks', 'boards', 'board_columns', 'profiles')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.tasks         enable row level security;
alter table public.boards        enable row level security;
alter table public.board_columns enable row level security;
alter table public.profiles      enable row level security;

-- ── "Do we work together?" ───────────────────────────────────────────────────
-- Security definer on purpose: org_members only lets you read your OWN
-- memberships, so a plain subquery here could never see the other person's.
create or replace function public.shares_org_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  select exists (
    select 1
    from org_members me
    join org_members them on them.org_id = me.org_id
    where me.user_id = auth.uid()
      and them.user_id = p_user
  );
$function$;

revoke all on function public.shares_org_with(uuid) from public;
grant execute on function public.shares_org_with(uuid) to authenticated;

-- ── Tasks: only in companies you belong to ───────────────────────────────────
-- Every task carries org_id (verified: zero rows without one), so this is the
-- whole rule. The subquery reads org_members, whose own rule already limits it
-- to the caller's memberships, so no definer helper is needed here.
create policy "tasks in my companies" on public.tasks
  for all
  to authenticated
  using      (org_id in (select org_id from org_members where user_id = auth.uid()))
  with check (org_id in (select org_id from org_members where user_id = auth.uid()));

-- ── Boards: same rule ────────────────────────────────────────────────────────
create policy "boards in my companies" on public.boards
  for all
  to authenticated
  using      (org_id in (select org_id from org_members where user_id = auth.uid()))
  with check (org_id in (select org_id from org_members where user_id = auth.uid()));

-- ── Columns: inherit from their board ────────────────────────────────────────
-- boards is now itself protected, so "a board I can see" is exactly right.
create policy "columns on my boards" on public.board_columns
  for all
  to authenticated
  using      (board_id in (select id from boards))
  with check (board_id in (select id from boards));

-- ── Profiles: yourself, and the people you work with ─────────────────────────
-- Reading a colleague is needed for real screens: birthdays on My Tasks, and
-- the account owner's name on the trial/past-due gates.
create policy "profiles I may see" on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or shares_org_with(id));

-- Editing is yourself only. New profiles are created by the signup trigger,
-- which runs as its owner, so no insert policy is needed here.
create policy "edit my own profile" on public.profiles
  for update
  to authenticated
  using      (id = auth.uid())
  with check (id = auth.uid());

notify pgrst, 'reload schema';
