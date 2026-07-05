-- Branding preference: lets a Business agency choose whether their uploaded
-- logo is shown across the app + on their public pages, or the default hque
-- logo. Defaults to the hque logo (false) until they explicitly opt in from
-- Settings → Agency Info. Uploading a logo alone does not switch branding.
alter table public.org_settings
  add column if not exists use_agency_logo boolean not null default false;

-- NOTE: the public branded-login page and talent-inquiry form read their
-- branding through the get_inquiry_org() SECURITY DEFINER function (defined in
-- the Supabase dashboard, not in this repo). For those two surfaces to honor
-- this toggle, get_inquiry_org must also return use_agency_logo. Until it does,
-- those pages safely fall back to the hque logo (the intended default).
