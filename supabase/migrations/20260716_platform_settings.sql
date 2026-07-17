-- Small key/value store for platform-level figures the master admin maintains
-- by hand (things with no live feed) — starting with the AppSumo payout total.
-- Read/write is restricted to platform admins.
--
-- Run in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.platform_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
drop policy if exists "platform_settings admin" on public.platform_settings;
create policy "platform_settings admin" on public.platform_settings
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Seed the current AppSumo payout (estimated), from the AppSumo dashboard.
insert into public.platform_settings (key, value)
values ('appsumo_revenue', jsonb_build_object('amount', 106.15, 'as_of', '2026-07-16'))
on conflict (key) do nothing;
