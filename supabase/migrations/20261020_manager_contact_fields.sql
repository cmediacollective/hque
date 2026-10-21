-- Manager contact details beyond name/email, so a talent's manager shows up
-- fully in Contacts (managers are derived from creators, not stored separately).
alter table public.creators
  add column if not exists manager_phone text,
  add column if not exists manager_title text,
  add column if not exists manager_company text;
