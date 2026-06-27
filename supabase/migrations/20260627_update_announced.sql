-- =====================================================================
-- Slack "new update" announcements
-- announced_at marks whether an item has already pinged the marketing Slack,
-- so each update notifies exactly once (the first time it becomes public).
-- Existing items are backfilled as already-announced so they don't all fire.
-- =====================================================================

alter table product_updates add column if not exists announced_at timestamptz;

update product_updates set announced_at = now() where announced_at is null;
