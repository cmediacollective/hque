-- Sidebar order for brands/clients — per person, not per workspace.
--
-- Supersedes 20260730_brand_order.sql, which stored one shared order on
-- brands.position and let only owners/admins set it. Everyone arranges their
-- own sidebar instead, and nobody else's view moves. Same shape as the pin
-- feature (user_brand_pins) it sits next to.
--
-- Because every row is owned by one user, RLS is enough — no SECURITY DEFINER
-- functions needed. The client upserts its own rows directly.
--
-- NOTE: applied in the Supabase dashboard. Paste into the SQL Editor and Run.
-- Safe to re-run.

-- ── Retire the shared-order attempt ──────────────────────────────────────────
drop function if exists public.reorder_brands(uuid, uuid[]);
drop function if exists public.reset_brand_order(uuid);
drop function if exists public.can_order_brands(uuid);
drop index if exists public.brands_org_position_idx;
alter table public.brands drop column if exists position;

-- ── Per-user order ───────────────────────────────────────────────────────────
create table if not exists public.user_brand_orders (
  user_id  uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  position int  not null,
  primary key (user_id, brand_id)
);

create index if not exists user_brand_orders_user_idx
  on public.user_brand_orders (user_id, position);

alter table public.user_brand_orders enable row level security;

-- Your rows and only your rows — read and write.
drop policy if exists "own brand order" on public.user_brand_orders;
create policy "own brand order" on public.user_brand_orders
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.user_brand_orders to authenticated;
