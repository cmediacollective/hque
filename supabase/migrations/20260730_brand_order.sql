-- Custom sidebar order for brands/clients (a.k.a. whatever the workspace has
-- renamed them to — Projects, Departments, Teams…).
--
-- Why: the sidebar was alphabetical only, so workspaces that wanted a few
-- entries at the top were prefixing names with "-" ("-Admin", "-Finances") to
-- game the sort. That hack is visible in every export, board header and
-- campaign dropdown. This lets them drag instead.
--
-- Model: brands.position is NULL until someone drags. NULL = "no custom order",
-- which sorts alphabetically. Once a workspace reorders, every active brand
-- gets a position, so anything created afterwards (still NULL) lands at the end
-- of the list rather than jumping into the middle.
--
-- The order is per-workspace and set by owners/admins — matching how the
-- customer's "-" prefixes already affected everyone on the team. Personal pins
-- (user_brand_pins) still float above it, unchanged.
--
--   • reorder_brands(org, brand_ids[])  -> writes the dragged order
--   • reset_brand_order(org)            -> back to plain A–Z
--
-- NOTE: applied in the Supabase dashboard. Paste into the SQL Editor and Run.
-- Safe to re-run.

alter table public.brands add column if not exists position int;

-- Sidebar reads sort on (position nulls last, name), so give the index the same
-- shape.
create index if not exists brands_org_position_idx
  on public.brands (org_id, position nulls last, name);

-- ── Who may reorder ──────────────────────────────────────────────────────────
-- Owner/admin of the workspace. Deliberately NOT plan-gated: putting your own
-- sidebar in order isn't a premium feature, and Starter workspaces are the ones
-- most likely to be using the "-" prefix hack today.
create or replace function public.can_order_brands(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  );
$$;
revoke all on function public.can_order_brands(uuid) from public;
grant execute on function public.can_order_brands(uuid) to authenticated;

-- ── Reorder ──────────────────────────────────────────────────────────────────
-- Takes the full ordered list of active brand ids. Ids that don't belong to
-- this workspace are ignored by the where clause rather than trusted.
create or replace function public.reorder_brands(p_org_id uuid, p_brand_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare i int;
begin
  if not public.can_order_brands(p_org_id) then raise exception 'Not allowed'; end if;
  for i in 1 .. coalesce(array_length(p_brand_ids, 1), 0) loop
    update public.brands set position = i
     where id = p_brand_ids[i] and org_id = p_org_id;
  end loop;
end; $$;
revoke all on function public.reorder_brands(uuid, uuid[]) from public;
grant execute on function public.reorder_brands(uuid, uuid[]) to authenticated;

-- ── Reset to alphabetical ────────────────────────────────────────────────────
create or replace function public.reset_brand_order(p_org_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_order_brands(p_org_id) then raise exception 'Not allowed'; end if;
  update public.brands set position = null where org_id = p_org_id;
end; $$;
revoke all on function public.reset_brand_order(uuid) from public;
grant execute on function public.reset_brand_order(uuid) to authenticated;
