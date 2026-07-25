-- Emoji reactions on task comments.
--
-- Anyone in the company can react to a comment with one of five reactions
-- (heart, happy face, thumbs up, thumbs down, green check mark) and can see who
-- reacted. One of each reaction per person per comment; reacting again removes
-- it. Reactions are stored as stable KEYS ('heart','smile','thumbsup',
-- 'thumbsdown','check') — the emoji and its skin tone are chosen in the app, so
-- the look can change with no data migration.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run.

create table if not exists public.task_comment_reactions (
  comment_id uuid not null references public.task_comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id)      on delete cascade,
  emoji      text not null check (emoji in ('heart','smile','thumbsup','thumbsdown','check')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);

create index if not exists task_comment_reactions_comment_id_idx
  on public.task_comment_reactions (comment_id);

alter table public.task_comment_reactions enable row level security;

-- SELECT: everyone in the same company can see all reactions on a comment (so
-- counts and "who reacted" show for the whole team). Scope = the reaction's
-- comment belongs to a task in an org the viewer is a member of.
drop policy if exists task_comment_reactions_select on public.task_comment_reactions;
create policy task_comment_reactions_select on public.task_comment_reactions
  for select
  using (
    exists (
      select 1
      from public.task_comments tc
      join public.tasks t        on t.id = tc.task_id
      join public.org_members om on om.org_id = t.org_id
      where tc.id = task_comment_reactions.comment_id
        and om.user_id = auth.uid()
    )
  );

-- INSERT: you may add a reaction only as yourself, and only on a comment that
-- belongs to a company you're a member of.
drop policy if exists task_comment_reactions_insert on public.task_comment_reactions;
create policy task_comment_reactions_insert on public.task_comment_reactions
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.task_comments tc
      join public.tasks t        on t.id = tc.task_id
      join public.org_members om on om.org_id = t.org_id
      where tc.id = task_comment_reactions.comment_id
        and om.user_id = auth.uid()
    )
  );

-- DELETE: you may remove only your OWN reaction (no time limit — unreacting is
-- always allowed).
drop policy if exists task_comment_reactions_delete on public.task_comment_reactions;
create policy task_comment_reactions_delete on public.task_comment_reactions
  for delete
  using (user_id = auth.uid());
