# HQue Changelog

A plain-English log of everything shipped. Newest at the top.

---

## 2026-04-24

**Dashboard hero: tighter, everything visible without scroll.** The fun fact pull-quote now sits on the right side of the header, opposite the greeting — uses the empty space and reads as a balanced two-column hero. The "Pick a brand/client on the left for the full board" helper that used to live at the bottom of the page (often below the fold) has been moved up into the hero, sitting on a second row with the Assigned/Watching legend on the right. Whole hero now packs date, greeting, task counts, fun fact, helper copy, and legend in one frame above the divider.

## 2026-04-23

**Fix: changing a task's column from the detail panel now actually saves.** Previously, opening a task and switching its status (e.g. "In Progress" → "Done") via the dropdown in the side panel looked like it worked, but the change was silently dropped on save — the card stayed in its original column and the task kept showing on your dashboard as to-do. Drag-and-drop was unaffected. Root cause: the detail-panel save was writing title/description/priority/due date but not `column_id`. Now it writes all of them, so changing status from the dropdown behaves identically to dragging the card between columns.

**"← My Tasks" back button is now blue.** The button in a brand board's header that returns you to your personal dashboard used to render as a subtle outlined pill. It now uses the app's signature blue (`#5b7c99`) with white text so it's easy to spot at a glance.

**Dashboard "+X more" is now expandable.** Each bucket (Today, This Week, Next Week — for both Assigned and Watching) still shows up to 5 tasks by default so you're not overwhelmed. The "+4 more" line under a full bucket is now a button — click it and the bucket expands to show everything; it becomes "Show less" so you can collapse it again. Each bucket remembers its own expanded state independently.

**Marking a task Done auto-saves and closes the panel.** Previously, switching the Status dropdown to Done required clicking Save and then clicking the X to close — three clicks to finish a task. Now, selecting a Done-type column from the dropdown saves everything automatically and closes the side panel in one step. Only applies when transitioning from a non-done column into a done one; other status changes (To Do, In Progress, Review, Hold) still save via the Save button so you can keep editing.

**Done tasks now visibly read as done.** Any task sitting in a "Done" column (or any column named Completed / Complete / Shipped / Closed, or simply the rightmost column on the board) now renders with a line-through on the title and a dimmed opacity — on both the Kanban board and the List view. Quick visual signal that a task is actually finished without having to check which column it's in.

**Past-due paywall.** When a customer's subscription payment fails, Stripe notifies our webhook and we flag the organization as `past_due` in Supabase (stamping when it started). On their next app load, those users hit a full-screen lockout — "Your payment didn't go through" — with one big "Update payment method" button that drops them into Stripe's billing portal. As soon as the payment succeeds, Stripe pings the webhook back and the flag clears, unlocking the app on their next load. Subscription cancellations also gracefully fall through to the existing upgrade wall. (Required one-time Supabase setup: `subscription_status` and `past_due_since` columns on `organizations`.)

## 2026-04-22

**Dashboard greeting with personality.** The "Good morning" header on the Workspace dashboard now detects 30+ holidays and fun days — fixed ones (Earth Day, Pi Day, May the 4th, Halloween, Christmas, Juneteenth, Kwanzaa, Pizza Day, Emoji Day, Coffee Day, Talk Like a Pirate Day, etc.), year-shifting ones (Lunar New Year, Hanukkah, Diwali with per-year dates through 2030), and computed ones (Thanksgiving, National Ice Cream Day, Mother's/Father's Day). On non-holiday days, a rotating fun fact appears under the task counts — different every day, stable within a day.

**Campaigns grid: truly responsive.** Was hardcoded to 3 columns on desktop and only evaluated at page-load, so resizing the window didn't reflow. Now uses CSS `auto-fill minmax(340px, 1fr)` — columns grow or shrink live as you drag the window. Campaign names now wrap to 2 lines instead of truncating to `...`, so long names and the status pill both fit cleanly.

**Talent card: Archive button moved inline.** The Archive button used to float in the top-right corner of a talent card on hover, overlapping the category type label. It now sits at the bottom of the card, inline after the Followers and Location stats. Still only appears on hover, desktop only.

**Fix: editing a campaign (and adding a brand from inside it).** A chain of three related bugs in the campaign edit flow: (1) `brands` table was missing its INSERT policy so inline brand creation errored out; (2) when editing an existing campaign, `CampaignDetail` wasn't passing `orgId` to the form, so brand creation failed the NOT NULL constraint; (3) `campaigns` table was missing its UPDATE policy so campaign saves silently no-op'd. Added RLS policies for both tables, wired `orgId` through on edit, and added real error surfacing on the save button so future silent failures show a visible error. (Required two one-time Supabase SQL runs — one per table.)

**Task file attachments (drag & drop).** Any task's side panel now has a Files section. Drag files from your desktop into the dashed drop zone, or click to choose. Files open/download in a new tab. Uploader can delete. Deleting the task cleans up its attachments automatically. (Required one-time Supabase setup: `task_attachments` table + `task-attachments` storage bucket.)

**Shareable task links.** Every task's side panel has a "Copy link" button that yields a URL like `https://h-que.com/?task=<id>`. Paste it into Slack/email — clicking it drops the recipient straight into Workspace with that task's side panel open.

**Notifications are clickable.** Every new notification (assignment, watching, comment, mention) now carries a task reference. Click a notification in the bell panel → it jumps to Workspace, picks the right brand, and opens the task's side panel. "Open task →" link appears on each clickable notification. Older notifications from before this change won't be clickable. (Required one-time Supabase setup: `task_id` column on `notifications`.)

**Back button to My Tasks dashboard.** When viewing any brand board, a "← My Tasks" button appears to the left of the brand logo — one click returns to your personal dashboard.

**My Tasks dashboard restored.** It had disappeared during the Phase 3 Workspace restructure. The Workspace empty state now shows your personal dashboard with greeting, assigned/watching task counts, overdue badge, and Today / This Week / Next Week buckets. Click any card to jump to that task's board. Desktop only — mobile sees a simple "select a brand" prompt.

**Comment email notifications working end-to-end.** Fixed the sender domain (was `hque.com`, should have been `h-que.com`) so Resend actually delivers. Comments now notify every assignee and watcher (including the commenter themselves) regardless of @mentions. Emails arrive from `noreply@h-que.com` with a proper subject for each notification type (comment / assignment / watching / mention).

## 2026-04-21

**Phase 3: brand-based Workspace.** Workspace now revolves around brands/clients. Each brand gets its own Kanban board with default columns To Do / In Progress / Review / Hold / Done. Toggle between Kanban and List views.

**TaskDetail side panel.** Clicking a task card opens a detailed side panel with title, description, status, priority, due date, assignees, watchers, comments, and brand assignment.

**Profile photos on task cards + assignee picker on new-task form.** Avatars on task cards show real profile photos when the user has uploaded one, initials otherwise. The "+ Add task" form now has an assignee picker with avatars.

**@mention autocomplete in comments.** Type `@` in a task's comment field to get a live autocomplete of team members.

## 2026-04-20

**My Tasks personal dashboard.** A personalized dashboard showing only tasks assigned to or watched by you, bucketed into Today / This Week / Next Week. Hides completed tasks.

**Auto-archive.** Completed tasks auto-archive after 7 days. "View Archive" button surfaces archived tasks.

**Agency timezone setting.** Added to Settings → Agency Info. Dashboards and date displays now respect your agency's local timezone.

**Timezone-safe date display.** Fixed date drift bugs where plain date-only fields (like due dates) showed off-by-one depending on the viewer's timezone.

**Campaigns polish.** Added "Pending Payment" status. Inline type + status dropdowns on campaign cards. Grid/list view toggle. Campaigns sorted alphabetically by brand, then by name.

**Talent card update.** Swapped Engagement Rate for Location on talent grid cards.
