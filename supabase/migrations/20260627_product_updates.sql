-- =====================================================================
-- Product Updates & Roadmap  (Phase 1)
-- A GLOBAL, cross-org list powering the public page at /updates and the
-- admin manager in Settings. Unlike the rest of HQue this is NOT org-scoped:
-- every account sees the same curated roadmap (it's C Media's product roadmap).
--
-- Visibility is controlled by `status`:
--   under_review / declined  -> private (platform admins only)
--   planned / in_progress / shipped -> public (anyone, no login)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Who is allowed to manage the roadmap (C Media staff only — NOT every
--    agency owner). A dedicated table so normal users can never grant
--    themselves access (there is no user-facing write path to it).
-- ---------------------------------------------------------------------
create table if not exists platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Seed Cherie as the first platform admin.
insert into platform_admins (user_id)
select id from auth.users where email = 'cherie@cmediacollective.com'
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- 2. The roadmap items
-- ---------------------------------------------------------------------
create table if not exists product_updates (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  status          text not null default 'under_review'
                    check (status in ('under_review','planned','in_progress','shipped','declined')),
  category        text default 'Feature'
                    check (category in ('Feature','Improvement','Fix')),
  shipped_at      date,                 -- set only when status = 'shipped'
  sort_order      int  not null default 0,
  vote_count      int  not null default 0,   -- used in Phase 3
  source          text not null default 'admin'  -- 'admin' | 'customer'
                    check (source in ('admin','customer')),
  submitter_name  text,                 -- used in Phase 2 (customer submissions)
  submitter_email text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists product_updates_status_idx on product_updates(status);

-- ---------------------------------------------------------------------
-- 3. Security: lock the table down, then open exactly two doors —
--    (a) platform admins manage everything, (b) the public sees only the
--    curated subset, and only through the get_public_updates() function.
-- ---------------------------------------------------------------------
alter table product_updates enable row level security;

drop policy if exists "platform admins manage product_updates" on product_updates;
create policy "platform admins manage product_updates"
  on product_updates for all
  using     (exists (select 1 from platform_admins pa where pa.user_id = auth.uid()))
  with check (exists (select 1 from platform_admins pa where pa.user_id = auth.uid()));

-- Public, read-only feed of the curated subset (bypasses RLS via SECURITY DEFINER).
create or replace function get_public_updates()
returns table (
  id uuid, title text, description text, status text,
  category text, shipped_at date, vote_count int
)
language sql security definer stable
as $$
  select id, title, description, status, category, shipped_at, vote_count
  from product_updates
  where status in ('planned','in_progress','shipped')
  order by
    case status when 'in_progress' then 0 when 'planned' then 1 else 2 end,
    shipped_at desc nulls last,
    sort_order asc,
    created_at desc
$$;

grant execute on function get_public_updates() to anon, authenticated;

-- Lets the app cheaply ask "should I show the admin manager?" without
-- exposing the platform_admins table.
create or replace function is_platform_admin()
returns boolean
language sql security definer stable
as $$
  select exists (select 1 from platform_admins pa where pa.user_id = auth.uid())
$$;

grant execute on function is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 4. Seed the roadmap so it launches full, not empty.
--    Recent, customer-facing wins from the changelog + the items that are
--    genuinely coming next (Phases 2 & 3 of this very feature).
-- ---------------------------------------------------------------------
insert into product_updates (title, description, status, category, shipped_at) values
  ('Submit your own feature requests',
   'Soon you''ll be able to send us ideas and feedback right from this page — no email needed.',
   'in_progress', 'Feature', null),
  ('Upvote the features you want most',
   'Vote on roadmap items so we know what matters most to you.',
   'planned', 'Feature', null),
  ('Create tasks directly in the List view',
   'Add tasks from any section of the Workspace List view, with full width to write details and paste links.',
   'shipped', 'Improvement', '2026-06-27'),
  ('Shareable links for campaigns, talent & tasks',
   'Clean, readable links you can copy and share — they open straight to the right campaign, profile, or task.',
   'shipped', 'Feature', '2026-06-27'),
  ('Public talent profile pages',
   'Share a clean, name-based public profile page for any talent on your roster.',
   'shipped', 'Feature', '2026-06-26'),
  ('Expandable comment box on tasks',
   'A roomier comment box for writing and reviewing longer task comments.',
   'shipped', 'Improvement', '2026-06-25'),
  ('Drag-and-drop file attachments on comments',
   'Drop files straight onto a comment to attach them in context.',
   'shipped', 'Feature', '2026-06-24'),
  ('Reports redesign with team performance',
   'A clearer Reports area with an Overview and a Team view showing who pitched, closed, and is managing each campaign.',
   'shipped', 'Feature', '2026-06-20');
