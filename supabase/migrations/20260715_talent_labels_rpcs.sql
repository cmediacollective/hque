-- Custom Talent Labels — Phase 2: the per-company write functions.
--
-- All are SECURITY DEFINER and gated by can_customize_labels(): the caller must
-- be an owner/admin of the company AND the company must be on a plan that can
-- customize (Pro, Business, lifetime, or still in trial). Starter (past trial)
-- is read-only.
--
--   • can_customize_labels(org)                       -> boolean (app + gate)
--   • add_talent_label(org, kind, label)
--   • rename_talent_label(org, kind, old, new)        -> cascades to tagged talent
--   • remove_talent_label(org, kind, label)           -> leaves it on tagged talent
--   • reorder_talent_labels(org, kind, labels[])
--
-- NOTE: applied in the Supabase dashboard. Paste into the SQL Editor and Run.
-- Safe to re-run.

-- ── Who may customize ────────────────────────────────────────────────────────
create or replace function public.can_customize_labels(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    exists (
      select 1 from public.org_members m
      where m.org_id = p_org_id and m.user_id = auth.uid() and m.role in ('owner','admin')
    )
    and exists (
      select 1 from public.organizations o
      where o.id = p_org_id
        and (o.is_lifetime = true
             or o.stripe_plan in ('pro','agency')
             or (o.trial_ends_at is not null and o.trial_ends_at > now()))
    );
$$;
revoke all on function public.can_customize_labels(uuid) from public;
grant execute on function public.can_customize_labels(uuid) to authenticated;

-- ── Add ──────────────────────────────────────────────────────────────────────
create or replace function public.add_talent_label(p_org_id uuid, p_kind text, p_label text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_label text := btrim(coalesce(p_label, '')); v_pos int;
begin
  if not public.can_customize_labels(p_org_id) then raise exception 'Not allowed'; end if;
  if p_kind not in ('type','niche') then raise exception 'Invalid kind'; end if;
  if length(v_label) = 0 then raise exception 'Label is required'; end if;
  select coalesce(max(position), 0) + 1 into v_pos
    from public.org_talent_labels where org_id = p_org_id and kind = p_kind;
  insert into public.org_talent_labels (org_id, kind, label, position)
  values (p_org_id, p_kind, v_label, v_pos)
  on conflict (org_id, kind, lower(label)) do nothing;
end; $$;
revoke all on function public.add_talent_label(uuid, text, text) from public;
grant execute on function public.add_talent_label(uuid, text, text) to authenticated;

-- ── Rename (cascades to tagged talent) ───────────────────────────────────────
create or replace function public.rename_talent_label(p_org_id uuid, p_kind text, p_old text, p_new text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_new text := btrim(coalesce(p_new, ''));
begin
  if not public.can_customize_labels(p_org_id) then raise exception 'Not allowed'; end if;
  if p_kind not in ('type','niche') then raise exception 'Invalid kind'; end if;
  if length(v_new) = 0 then raise exception 'Label is required'; end if;
  if exists (
    select 1 from public.org_talent_labels
    where org_id = p_org_id and kind = p_kind and lower(label) = lower(v_new) and lower(label) <> lower(p_old)
  ) then
    raise exception 'A % called "%" already exists.', p_kind, v_new;
  end if;

  update public.org_talent_labels set label = v_new
   where org_id = p_org_id and kind = p_kind and lower(label) = lower(p_old);

  -- Cascade to every talent already tagged with the old label.
  if p_kind = 'type' then
    update public.creators set types = array_replace(types, p_old, v_new)
      where org_id = p_org_id and types is not null and p_old = any(types);
    update public.creators set type = v_new
      where org_id = p_org_id and type = p_old;
  else
    update public.creators set niches = array_replace(niches, p_old, v_new)
      where org_id = p_org_id and niches is not null and p_old = any(niches);
  end if;
end; $$;
revoke all on function public.rename_talent_label(uuid, text, text, text) from public;
grant execute on function public.rename_talent_label(uuid, text, text, text) to authenticated;

-- ── Remove (off the picker; stays on already-tagged talent) ──────────────────
create or replace function public.remove_talent_label(p_org_id uuid, p_kind text, p_label text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_customize_labels(p_org_id) then raise exception 'Not allowed'; end if;
  delete from public.org_talent_labels
   where org_id = p_org_id and kind = p_kind and lower(label) = lower(p_label);
end; $$;
revoke all on function public.remove_talent_label(uuid, text, text) from public;
grant execute on function public.remove_talent_label(uuid, text, text) to authenticated;

-- ── Reorder ──────────────────────────────────────────────────────────────────
create or replace function public.reorder_talent_labels(p_org_id uuid, p_kind text, p_labels text[])
returns void language plpgsql security definer set search_path = '' as $$
declare i int;
begin
  if not public.can_customize_labels(p_org_id) then raise exception 'Not allowed'; end if;
  for i in 1 .. coalesce(array_length(p_labels, 1), 0) loop
    update public.org_talent_labels set position = i
     where org_id = p_org_id and kind = p_kind and lower(label) = lower(p_labels[i]);
  end loop;
end; $$;
revoke all on function public.reorder_talent_labels(uuid, text, text[]) from public;
grant execute on function public.reorder_talent_labels(uuid, text, text[]) to authenticated;
