-- =====================================================================
-- Product Updates — Phase 2: customer submissions
-- A locked-down way for ANY visitor (logged in or not) to submit a feature
-- request. It can ONLY create a private 'under_review' / 'customer' row — the
-- caller cannot choose a public status, cannot read other rows, cannot edit.
-- Everything else still goes through the platform-admin RLS policy.
-- =====================================================================

create or replace function submit_feature_request(
  p_title       text,
  p_description text,
  p_name        text,
  p_email       text
) returns void
language plpgsql security definer
as $$
begin
  if p_title is null or length(trim(p_title)) < 3 then
    raise exception 'Please enter a few more words describing your idea.';
  end if;

  insert into product_updates (title, description, status, category, source, submitter_name, submitter_email)
  values (
    left(trim(p_title), 200),
    nullif(trim(coalesce(p_description, '')), ''),
    'under_review',
    'Feature',
    'customer',
    nullif(trim(coalesce(p_name, '')), ''),
    nullif(trim(coalesce(p_email, '')), '')
  );
end;
$$;

grant execute on function submit_feature_request(text, text, text, text) to anon, authenticated;
