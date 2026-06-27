-- Ownership & accountability columns for campaigns.
-- Each references a team member (profiles.id, which equals their login user id).
-- All nullable and default NULL, so every existing campaign is unaffected.

alter table campaigns
  add column if not exists pitched_by       uuid references profiles(id),
  add column if not exists campaign_manager uuid references profiles(id),
  add column if not exists closed_by        uuid references profiles(id);

comment on column campaigns.pitched_by       is 'Team member who pitched the campaign';
comment on column campaigns.campaign_manager is 'Team member running the campaign day-to-day';
comment on column campaigns.closed_by        is 'Team member who closed the deal; auto-set when status first becomes Active, unless set manually';
