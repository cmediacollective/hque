-- Task comments: you may edit or delete only your OWN comment, and only within
-- 5 minutes of posting it. The old policies allowed editing/deleting your own
-- comment at any time; this adds the 5-minute window to both.
--
-- Run in the Supabase SQL Editor. Safe to re-run.

drop policy if exists task_comments_delete on public.task_comments;
create policy task_comments_delete on public.task_comments
  for delete
  using (
    user_id = auth.uid()
    and created_at > now() - interval '5 minutes'
  );

drop policy if exists task_comments_update on public.task_comments;
create policy task_comments_update on public.task_comments
  for update
  using (
    user_id = auth.uid()
    and created_at > now() - interval '5 minutes'
  )
  with check (user_id = auth.uid());
