-- Task comments: you may delete only your OWN comment, and only within 5
-- minutes of posting it. The old policy allowed deleting your own comment at any
-- time; this adds the time window. (Editing your own comment is still allowed
-- any time — an "edited" marker is shown.)
--
-- Run in the Supabase SQL Editor. Safe to re-run.

drop policy if exists task_comments_delete on public.task_comments;
create policy task_comments_delete on public.task_comments
  for delete
  using (
    user_id = auth.uid()
    and created_at > now() - interval '5 minutes'
  );
