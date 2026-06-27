-- =====================================================================
-- Roadmap upvoting (Phase 3a)
-- Anyone (logged in or not) can upvote a public roadmap item. The browser
-- remembers what it voted for (one vote per item per browser); this RPC just
-- nudges the count up or down and can never touch private/under-review rows.
-- =====================================================================

create or replace function vote_for_update(p_id uuid, p_delta int)
returns int
language plpgsql security definer
as $$
declare new_count int;
begin
  update product_updates
  set vote_count = greatest(0, vote_count + (case when p_delta > 0 then 1 else -1 end))
  where id = p_id
    and status in ('planned', 'in_progress', 'shipped')
  returning vote_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

grant execute on function vote_for_update(uuid, int) to anon, authenticated;

-- Surface the most-wanted Planned / In-Progress items first (Shipped stays
-- newest-first by date — votes don't reorder history).
create or replace function get_public_updates()
returns table (
  id uuid, title text, description text, status text,
  category text, shipped_at date, vote_count int
)
language sql security definer stable
as $$
  select id, title, description, status, category, shipped_at, vote_count
  from product_updates
  where status in ('planned', 'in_progress', 'shipped')
  order by
    case status when 'in_progress' then 0 when 'planned' then 1 else 2 end,
    (case when status <> 'shipped' then vote_count else 0 end) desc,
    shipped_at desc nulls last,
    sort_order asc,
    created_at desc
$$;

grant execute on function get_public_updates() to anon, authenticated;

-- Upvoting itself just shipped — flip its roadmap item from Planned to Shipped.
update product_updates
set status = 'shipped', shipped_at = '2026-06-27'
where title = 'Upvote the features you want most';
