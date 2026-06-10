-- Per-comment attachments on task comments.
--
-- Reuses the existing task_attachments table + task-attachments storage bucket.
-- A NULL comment_id means a task-level attachment (the existing "Files" section);
-- a set comment_id means the attachment belongs to that specific comment.
-- ON DELETE CASCADE: deleting a comment also removes its attachment rows.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run.

alter table public.task_attachments
  add column if not exists comment_id uuid references public.task_comments(id) on delete cascade;

create index if not exists task_attachments_comment_id_idx
  on public.task_attachments (comment_id);
