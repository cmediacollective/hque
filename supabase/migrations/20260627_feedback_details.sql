-- =====================================================================
-- Product Updates — richer customer submissions
-- Adds: type (reuses `category`: Feature / Improvement / Fix), the app
-- `area` it relates to, and an optional `screenshot_url`. Plus a public
-- storage bucket so visitors can attach a screenshot of an issue.
-- =====================================================================

alter table product_updates add column if not exists area            text;
alter table product_updates add column if not exists screenshot_url  text;

-- Public bucket for submitted screenshots.
insert into storage.buckets (id, name, public)
values ('feedback-screenshots', 'feedback-screenshots', true)
on conflict (id) do nothing;

-- Anyone may upload a screenshot into this bucket (and read them back).
drop policy if exists "upload feedback screenshots" on storage.objects;
create policy "upload feedback screenshots"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'feedback-screenshots');

drop policy if exists "read feedback screenshots" on storage.objects;
create policy "read feedback screenshots"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'feedback-screenshots');

-- Replace the submit function with one that captures type, area, screenshot.
drop function if exists submit_feature_request(text, text, text, text);

create or replace function submit_feature_request(
  p_title         text,
  p_description   text,
  p_name          text,
  p_email         text,
  p_category      text default 'Feature',
  p_area          text default null,
  p_screenshot_url text default null
) returns void
language plpgsql security definer
as $$
begin
  if p_title is null or length(trim(p_title)) < 3 then
    raise exception 'Please enter a few more words describing your idea.';
  end if;

  insert into product_updates (title, description, status, category, source, submitter_name, submitter_email, area, screenshot_url)
  values (
    left(trim(p_title), 200),
    nullif(trim(coalesce(p_description, '')), ''),
    'under_review',
    case when p_category in ('Feature','Improvement','Fix') then p_category else 'Feature' end,
    'customer',
    nullif(trim(coalesce(p_name, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_area, '')), ''),
    nullif(trim(coalesce(p_screenshot_url, '')), '')
  );
end;
$$;

grant execute on function submit_feature_request(text, text, text, text, text, text, text) to anon, authenticated;
