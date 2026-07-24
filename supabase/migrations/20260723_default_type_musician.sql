-- Add "Musician" as a default talent Type.
--
--   • talent_label_defaults — the master list every NEW company inherits.
--   • org_talent_labels     — every EXISTING company also gets it, appended to
--     the end of their own Types list so nothing they've customized moves.
--
-- Purely additive: no label is renamed, removed, or reordered, and no talent
-- loses a tag. Safe to re-run (both inserts are on-conflict-do-nothing).
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once.

-- ── Master defaults (seeds future companies) ─────────────────────────────────
insert into public.talent_label_defaults (kind, label, position)
select 'type', 'Musician', coalesce(max(position), 0) + 1
from public.talent_label_defaults where kind = 'type'
on conflict (kind, lower(label)) do nothing;

-- ── Every existing company, appended after their current Types ───────────────
insert into public.org_talent_labels (org_id, kind, label, position)
select o.id, 'type', 'Musician',
       coalesce((select max(l.position) from public.org_talent_labels l
                 where l.org_id = o.id and l.kind = 'type'), 0) + 1
from public.organizations o
on conflict (org_id, kind, lower(label)) do nothing;
