-- Permanently delete a brand and everything under it. Used by the archive-only
-- Delete action (type-the-name confirmation on the client).
--
-- The FK graph: task children (comments/attachments/assignees/watchers/
-- notifications) CASCADE off tasks; board_columns CASCADE off boards. But
-- boards→brands and campaigns→brands are SET NULL, and tasks→boards is NO
-- ACTION — so a plain "delete from brands" would orphan boards/tasks/campaigns.
-- This removes them explicitly, in dependency order.
--
-- Campaigns: left as "unassigned" (the DB sets their brand_id to NULL) rather
-- than deleted, so campaign history isn't lost. (Change if Cherie wants them
-- deleted too.)
--
-- Authorization: owner/admin of the brand's org only. SECURITY DEFINER.
--
-- Run in the Supabase SQL Editor. Safe to re-run.

create or replace function public.delete_brand(p_brand_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from brands where id = p_brand_id;
  if v_org is null then
    raise exception 'Brand not found';
  end if;
  if not exists (
    select 1 from org_members m
    where m.org_id = v_org and m.user_id = auth.uid() and m.role in ('owner','admin')
  ) then
    raise exception 'Only owners and admins can delete a brand';
  end if;

  -- Tasks first (their comments/attachments/assignees/watchers/notifications
  -- cascade automatically). Tasks link to a brand only via their board.
  delete from tasks where board_id in (select id from boards where brand_id = p_brand_id);

  -- Boards (board_columns cascade off them).
  delete from boards where brand_id = p_brand_id;

  -- The brand's own attached records.
  delete from brand_contacts where brand_id = p_brand_id;
  delete from brand_notes_views where brand_id = p_brand_id;
  delete from user_brand_pins where brand_id = p_brand_id;

  -- Finally the brand. Any campaigns pointing at it become unassigned (brand_id
  -- set to NULL by the DB), rather than being deleted.
  delete from brands where id = p_brand_id;
end;
$$;

revoke all on function public.delete_brand(uuid) from public;
grant execute on function public.delete_brand(uuid) to authenticated;
