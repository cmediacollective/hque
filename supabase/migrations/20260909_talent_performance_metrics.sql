-- Performance metrics + audience breakdown on a talent, for the one-pager export.
--
-- The one-pager (Talent → a talent → One-pager) prints the kind of media-kit
-- sheet brands ask for: followers and engagement alongside reach, story views,
-- link clicks and an audience split.
--
-- Two jsonb columns rather than a dozen scalar ones, because these numbers move
-- as a set (they're all "last 30 days" from the same Insights screen) and the
-- shape will grow — a future automated pull can write the same object without
-- another migration.
--
--   metrics = {
--     period: 'Last 30 days',      -- printed under the METRICS heading
--     avg_views: 116381,
--     avg_engagement: 2171,
--     avg_story_reach: 11090,
--     avg_story_views: 14480,
--     avg_link_clicks: 1389,
--     reach_engagement_rate: 4.58, -- percent; engagement over REACH, not followers
--     source: 'manual',            -- 'manual' today; an API name later
--     updated_at: '2026-09-09'     -- so a stale sheet is obvious
--   }
--
--   audience = {
--     female: 80.4,                -- percent
--     male: 6.8,
--     ages: [ { label: '35-44', pct: 53.1 }, { label: '25-34', pct: 25.2 } ]
--   }
--
-- Everything is optional. A talent with an empty metrics/audience object simply
-- prints a one-pager without those blocks.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

alter table public.creators
  add column if not exists metrics jsonb not null default '{}'::jsonb;

alter table public.creators
  add column if not exists audience jsonb not null default '{}'::jsonb;
