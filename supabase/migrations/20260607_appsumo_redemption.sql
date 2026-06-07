-- AppSumo lifetime redemption
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Safe to run more than once: every statement is guarded with IF NOT EXISTS.

-- 1. Distinguish AppSumo lifetime buyers from monthly subscribers.
--    is_lifetime = true  →  permanent Pro, no Stripe subscription, never downgraded.
alter table organizations
  add column if not exists is_lifetime boolean not null default false;

-- 2. The pool of redemption codes handed to AppSumo.
--    One row per code. status flips unused → redeemed exactly once.
create table if not exists appsumo_codes (
  code          text primary key,
  status        text not null default 'unused' check (status in ('unused', 'redeemed')),
  redeemed_by   uuid references organizations(id),
  redeemed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Fast lookups when claiming a code.
create index if not exists appsumo_codes_status_idx on appsumo_codes (status);

-- 3. Lock the table down. RLS is ON with NO policies, so the anon/auth
--    (browser) keys can never read, list, or modify codes. Only the
--    service-role key used by the redeem-appsumo function bypasses RLS.
alter table appsumo_codes enable row level security;
