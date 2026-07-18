-- Custom "Brand/Client" section label — each company can rename the section
-- (e.g. "Departments", "Categories") to whatever fits them.
--
-- The chosen words live on org_settings as two nullable columns. NULL / blank
-- means "use the default" — so every existing company keeps the standard
-- "Brand/Client" / "Brands/Clients" wording until they choose otherwise.
--
-- Picked during onboarding or edited in Settings → Agency Info. Both write these
-- columns directly (owners/admins already have the org_settings update policy),
-- so no RPC is needed.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

alter table public.org_settings
  add column if not exists client_label_singular text;

alter table public.org_settings
  add column if not exists client_label_plural text;
