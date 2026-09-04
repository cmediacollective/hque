-- Repeating tasks.
--
-- A task can carry a repeat rule. When it is moved into a "done" column, the
-- database immediately creates the next one in the series and points the
-- finished task at it. Nothing runs on a schedule: no completion, no new task.
--
--   • tasks.repeat_*            — the rule, and how far through the series we are
--   • next_repeat_date(...)     — works out the next due date from the rule
--   • is_done_column(column)    — same rule the app uses (named like Done, or
--                                 the rightmost column on its board)
--   • spawn_repeat_task()       — the trigger that makes the copy
--
-- It lives in a trigger rather than the app so that EVERY way of finishing a
-- task works — dragging the card, the Status dropdown, or anything added later.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

-- ── The rule, stored on the task ─────────────────────────────────────────────
alter table public.tasks
  add column if not exists repeat_freq         text,        -- null = doesn't repeat
  add column if not exists repeat_weekdays     smallint[],  -- weekly: 0=Sun … 6=Sat
  add column if not exists repeat_monthly_mode text,        -- 'date' | 'weekday'
  add column if not exists repeat_ends         text not null default 'never',
  add column if not exists repeat_until        date,        -- ends = 'on'
  add column if not exists repeat_times        int,         -- ends = 'after'
  add column if not exists repeat_done         int not null default 0,
  add column if not exists repeat_next_id      uuid;        -- set on the finished task

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_repeat_freq_check') then
    alter table public.tasks add constraint tasks_repeat_freq_check
      check (repeat_freq is null or repeat_freq in
        ('daily','weekdays','weekly','biweekly','monthly','quarterly','yearly'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_repeat_ends_check') then
    alter table public.tasks add constraint tasks_repeat_ends_check
      check (repeat_ends in ('never','on','after'));
  end if;
end $$;

-- ── When is the next one due? ────────────────────────────────────────────────
create or replace function public.next_repeat_date(
  p_freq text, p_weekdays smallint[], p_monthly_mode text, p_from date
)
returns date
language plpgsql
immutable
as $function$
declare
  v_base        date := coalesce(p_from, current_date);
  v_months      int;
  v_nth         int;
  v_target_dow  int;
  v_month_start date;
  v_first       date;
  d             date;
  i             int;
begin
  if p_freq is null then
    return null;
  end if;

  if p_freq = 'daily' then
    return v_base + 1;
  end if;

  if p_freq = 'weekdays' then
    d := v_base + 1;
    while extract(dow from d) in (0, 6) loop
      d := d + 1;
    end loop;
    return d;
  end if;

  if p_freq = 'weekly' then
    -- The soonest chosen weekday strictly after the current due date.
    if p_weekdays is null or array_length(p_weekdays, 1) is null then
      return v_base + 7;
    end if;
    for i in 1..7 loop
      d := v_base + i;
      if extract(dow from d)::smallint = any(p_weekdays) then
        return d;
      end if;
    end loop;
    return v_base + 7;
  end if;

  if p_freq = 'biweekly' then
    return v_base + 14;
  end if;

  if p_freq in ('monthly', 'quarterly', 'yearly') then
    -- "The first Monday", "the third Thursday" — keep the position, not the date.
    if p_freq = 'monthly' and p_monthly_mode = 'weekday' then
      v_nth         := ceil(extract(day from v_base) / 7.0)::int;
      v_target_dow  := extract(dow from v_base)::int;
      v_month_start := (date_trunc('month', v_base) + interval '1 month')::date;
      v_first       := v_month_start + ((v_target_dow - extract(dow from v_month_start)::int + 7) % 7);
      d             := v_first + (v_nth - 1) * 7;
      -- A fifth Tuesday doesn't exist every month; fall back to the last one.
      while extract(month from d) <> extract(month from v_month_start) loop
        d := d - 7;
      end loop;
      return d;
    end if;

    -- Same day of the month, clamped so the 31st doesn't skip February.
    v_months := case p_freq when 'monthly' then 1 when 'quarterly' then 3 else 12 end;
    d := (date_trunc('month', v_base) + (v_months || ' month')::interval)::date;
    return d + least(
      extract(day from v_base)::int,
      extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int
    ) - 1;
  end if;

  return null;
end;
$function$;

-- ── Is this column a "done" column? ──────────────────────────────────────────
-- Mirrors src/boardUtils.js: named like one, or the rightmost column on its
-- board (that's where finished work lands, whatever it's been renamed to).
create or replace function public.is_done_column(p_column_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $function$
  select exists (
    select 1 from board_columns c
    where c.id = p_column_id
      and (
        lower(btrim(c.name)) in ('done','completed','complete','shipped','closed')
        or c.position = (select max(c2.position) from board_columns c2 where c2.board_id = c.board_id)
      )
  );
$function$;

-- ── Make the next one when this one is finished ──────────────────────────────
create or replace function public.spawn_repeat_task()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_next      date;
  v_done      int;
  v_first_col uuid;
  v_pos       int;
  v_new       uuid;
begin
  -- Only on the move INTO done, and only for a task that repeats.
  if new.repeat_freq is null then return new; end if;
  if new.column_id is not distinct from old.column_id then return new; end if;
  if not is_done_column(new.column_id) then return new; end if;
  if is_done_column(old.column_id) then return new; end if;
  -- Already spawned its successor once. Dragging a finished task out of Done
  -- and back in must not make a second copy.
  if new.repeat_next_id is not null then return new; end if;

  v_done := coalesce(old.repeat_done, 0) + 1;

  -- "Ends after N times" — this completion may have been the last one.
  if new.repeat_ends = 'after'
     and (new.repeat_times is null or v_done >= new.repeat_times) then
    new.repeat_done := v_done;
    return new;
  end if;

  v_next := next_repeat_date(
    new.repeat_freq, new.repeat_weekdays, new.repeat_monthly_mode,
    coalesce(new.due_date, current_date)
  );
  if v_next is null then
    return new;
  end if;

  -- "Ends on a date" — stop once the next one would fall past it.
  if new.repeat_ends = 'on'
     and (new.repeat_until is null or v_next > new.repeat_until) then
    new.repeat_done := v_done;
    return new;
  end if;

  -- The copy starts at the beginning of the same board.
  select id into v_first_col
  from board_columns where board_id = new.board_id
  order by position asc limit 1;
  if v_first_col is null then return new; end if;

  select count(*) into v_pos from tasks where column_id = v_first_col;

  insert into tasks (
    title, description, priority, due_date, is_ongoing,
    column_id, board_id, org_id, position, campaign_id,
    repeat_freq, repeat_weekdays, repeat_monthly_mode,
    repeat_ends, repeat_until, repeat_times, repeat_done
  ) values (
    new.title, new.description, new.priority, v_next, false,
    v_first_col, new.board_id, new.org_id, v_pos, new.campaign_id,
    new.repeat_freq, new.repeat_weekdays, new.repeat_monthly_mode,
    new.repeat_ends, new.repeat_until, new.repeat_times, v_done
  )
  returning id into v_new;

  -- The same people, on the new one.
  insert into task_assignees (task_id, user_id)
  select v_new, user_id from task_assignees where task_id = new.id
  on conflict do nothing;

  insert into task_watchers (task_id, user_id)
  select v_new, user_id from task_watchers where task_id = new.id
  on conflict do nothing;

  -- Point the finished task at its successor, so the app can say what happened.
  new.repeat_next_id := v_new;
  new.repeat_done    := v_done;
  return new;
end;
$function$;

drop trigger if exists tasks_spawn_repeat on public.tasks;
create trigger tasks_spawn_repeat
  before update on public.tasks
  for each row execute function public.spawn_repeat_task();

-- next_repeat_date is pure date arithmetic that touches no data, so it stays
-- callable — handy for checking a rule without completing a task. The done-column
-- lookup is security definer, so that one is signed-in users only.
revoke all on function public.is_done_column(uuid) from public;
grant execute on function public.is_done_column(uuid) to authenticated;
grant execute on function public.next_repeat_date(text, smallint[], text, date) to anon, authenticated;

-- Make PostgREST notice the new columns straight away rather than on its next
-- restart, so the app doesn't report them as missing.
notify pgrst, 'reload schema';
