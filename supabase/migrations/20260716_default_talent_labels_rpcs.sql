-- Custom Talent Labels — Phase 3: master "Default Labels" functions.
--
-- Let a platform admin curate the master default Type/Niche lists that seed
-- every NEW company (talent_label_defaults). These do NOT touch any existing
-- company's list — defaults only apply to companies created afterward.
--
-- All are SECURITY DEFINER and refuse unless the caller is a platform admin.
--
-- NOTE: applied in the Supabase dashboard. Paste into the SQL Editor and Run.
-- Safe to re-run.

create or replace function public.add_default_talent_label(p_kind text, p_label text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_label text := btrim(coalesce(p_label, '')); v_pos int;
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_kind not in ('type','niche') then raise exception 'Invalid kind'; end if;
  if length(v_label) = 0 then raise exception 'Label is required'; end if;
  select coalesce(max(position), 0) + 1 into v_pos from public.talent_label_defaults where kind = p_kind;
  insert into public.talent_label_defaults (kind, label, position)
  values (p_kind, v_label, v_pos)
  on conflict (kind, lower(label)) do nothing;
end; $$;
revoke all on function public.add_default_talent_label(text, text) from public;
grant execute on function public.add_default_talent_label(text, text) to authenticated;

create or replace function public.rename_default_talent_label(p_kind text, p_old text, p_new text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_new text := btrim(coalesce(p_new, ''));
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_kind not in ('type','niche') then raise exception 'Invalid kind'; end if;
  if length(v_new) = 0 then raise exception 'Label is required'; end if;
  if exists (select 1 from public.talent_label_defaults where kind = p_kind and lower(label) = lower(v_new) and lower(label) <> lower(p_old)) then
    raise exception 'A % called "%" already exists.', p_kind, v_new;
  end if;
  update public.talent_label_defaults set label = v_new where kind = p_kind and lower(label) = lower(p_old);
end; $$;
revoke all on function public.rename_default_talent_label(text, text, text) from public;
grant execute on function public.rename_default_talent_label(text, text, text) to authenticated;

create or replace function public.remove_default_talent_label(p_kind text, p_label text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  delete from public.talent_label_defaults where kind = p_kind and lower(label) = lower(p_label);
end; $$;
revoke all on function public.remove_default_talent_label(text, text) from public;
grant execute on function public.remove_default_talent_label(text, text) to authenticated;

create or replace function public.reorder_default_talent_labels(p_kind text, p_labels text[])
returns void language plpgsql security definer set search_path = '' as $$
declare i int;
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  for i in 1 .. coalesce(array_length(p_labels, 1), 0) loop
    update public.talent_label_defaults set position = i where kind = p_kind and lower(label) = lower(p_labels[i]);
  end loop;
end; $$;
revoke all on function public.reorder_default_talent_labels(text, text[]) from public;
grant execute on function public.reorder_default_talent_labels(text, text[]) to authenticated;
