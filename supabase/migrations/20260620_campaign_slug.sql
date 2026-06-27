-- Clean, name-based shareable links for campaigns (h-que.com/campaign/<slug>).
-- The slug is claimed the first time a campaign's link is copied. Nullable, so
-- existing campaigns are unaffected until shared.

alter table public.campaigns add column if not exists slug text;

-- Slugs must be globally unique, but only once actually set.
create unique index if not exists campaigns_slug_unique
  on public.campaigns (slug) where slug is not null;

comment on column public.campaigns.slug is 'URL slug for the shareable in-app link; claimed on first copy';
