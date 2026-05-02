# HQue Changelog

A plain-English log of everything shipped. Newest at the top.

---

## 2026-05-02

**Archived campaigns now show with a strikethrough.** In every view (grid, list, board card, and detail panel header), archived campaign names render with a line through them and dimmed — same visual cue as completed tasks.

**Workspace tasks are no longer auto-created from campaigns.** The auto-task and the two-way status sync are removed. Workspace tasks live independently — create them yourself in the workspace and link to a campaign with the new "Linked campaign" dropdown in the task detail panel. When you archive a campaign (via any path: detail Archive button, drag to Archived column, or the modal), any workspace tasks linked to it get cleaned up so nothing orphans in the workspace.

**Removed the redundant "Archived" toggle at the top of Campaigns.** Now that the Board view has its own Archived column, the toggle was duplicate UI. Grid and list show only active campaigns; archived ones live in the Board's collapsed Archived column where they're one click away.

## 2026-05-02

**Campaigns has a Board view.** Third toggle in the sidebar (Grid · List · **Board**). Kanban-style columns by status — `Pitch · Active · Pending Payment · Completed · Cancelled · Archived` — with the same campaign cards stacked inside each column. Drag a card from one column to another to change its status (or drop it into Archived to archive it; drag back to bring it back). The Archived column is collapsed by default to a thin sliver showing just the count, click it to expand. Grid is still your default; the Board is for "where are we on each one at a glance". When you drag a card across columns, the linked workspace task moves to its matching column too — same two-way sync as before.

**Archive / Unarchive button on the campaign detail panel.** A clear button now sits next to Edit at the top of the campaign panel — no more relying on the hover-only button on the card. Confirms before archiving, restores in one click.

**Remove a brand logo without recreating the brand.** A "Remove" button now sits next to "Change logo" in the campaign form whenever a brand has a logo. Click it (with a confirm prompt) and the logo clears from the brand record everywhere.

**Campaign type now shows in the campaign detail panel.** Open any campaign and you'll see a small badge next to the Status pill — Paid, Non-paid, Gifting, or Seeding — so you don't have to open the form to check what kind of campaign it is.

**Brand logo can now be added or changed from the campaign form.** When a brand is linked to a campaign, a small "Add logo" or "Change logo" button sits next to the brand name. Click it, pick a file, and the logo updates on the brand record everywhere — no need to delete and recreate the brand. The brand row is now always visible whenever a brand is linked (used to only show when a logo was already set).

**Brand info on a campaign now falls back to the brand record.** If a campaign was saved with `brand_id` set but the cached name/logo/website got out of sync, the campaign detail panel pulls those fields fresh from the linked brand. Same on the form — if a legacy campaign has the brand name as text but no `brand_id`, opening it in the form auto-matches by name and links it for you.

**Better comment-error messages.** The "comments table doesn't exist" detection now matches Supabase's actual wording ("Could not find the table … in the schema cache") and gives a step-by-step instruction to run the SQL.

**Brand website is now editable on the campaign form.** A new **Brand Website** field sits right under the Brand selector — type or paste a URL once and it saves to both the campaign and the brand record itself, so every future campaign for that brand auto-fills from then on. The inline "+ New" brand creator also has a Website field now, so brands can be created with a website from day one.

**Past campaigns get backfilled into the workspace.** When you open the Campaigns tab, any non-archived campaign that doesn't already have a workspace task gets one created in the right column for its status (Pitch → To Do, Active → In Progress, etc.). Runs once per session, idempotent — no duplicates if you reload.

**Comment errors now show on screen.** If posting a campaign comment fails, the reason appears under the Comment button instead of silently doing nothing. Most common reason: the `campaign_comments` table hasn't been created in Supabase yet — the message will tell you so.

**Campaigns now have team comments.** The campaign detail panel has a new Comments section at the bottom that works just like task comments: post, edit, delete your own. URLs and email addresses are clickable. Type `@` and a dropdown of your teammates appears — pick one and they get a notification (in-app + email) that they were mentioned. Required one-time Supabase setup: `campaign_comments` table (SQL provided separately).

**Campaigns auto-create a workspace task — and the two stay in sync.** When you save a new campaign, a task with the campaign's name lands in the **To Do** column of that brand's workspace board (or your Internal board if there's no brand). After that, the two are linked: change the campaign's status and the task moves columns automatically (Pitch → To Do, Active → In Progress, Pending Payment → Review, Completed → Done). Drag the task to a new column in the workspace and the campaign's status updates to match. Existing campaigns get a task the next time you save them. Required one-time Supabase setup: `campaign_id` column on `tasks` (SQL provided separately).

**Instagram handles on talent are clickable.** The `@handle` shown on the talent grid, talent list view, talent inside a campaign card, talent search dropdown, and the talent detail header all now open the Instagram profile in a new tab. (Outside of those handle fields — in notes, comments, descriptions — paste the full URL like `instagram.com/cherie` or `https://example.com` to make it a link, same as before.)

## 2026-04-28

**Talent grid is now responsive on desktop.** The talent tab no longer locks to four cards across — as the window narrows, cards reflow from four → three → two columns instead of squeezing and clipping the copy inside each card. Each card holds a minimum width (~280px), and the grid fits as many as the window allows. Mobile stays one card per row as before.

## 2026-04-26

**Phase 2 marketing components: cursor, hover-reveal list, marquee.** Three reusable building blocks for the upcoming landing page redesign — built and parked in `/src/components/marketing/`, not wired into any production page yet. Review at **`h-que.com/sandbox`** (a new dev-only route that renders all three with placeholder content). (1) **`<Cursor />`** — replaces the system cursor with an 8px ink dot that lerps toward the mouse using requestAnimationFrame; over a link or any `[data-cursor="hover"]` element, it expands into a 40px outlined circle. Pure refs (no React re-renders on mousemove), translate3d only (no left/top), hidden on touch. Body cursor is hidden only while the component is mounted. (2) **`<HoverRevealList items={[...]} />`** — the artworld.agency pattern. Renders items in big italic Fraunces; on hover, the other items dim to 25% and a 280×360 image appears, trailing the cursor with a slower lerp (0.12) so it has weight. On mobile, the hover behavior turns off and items stack with the image inline below each label. (3) **`<Marquee speed={30} direction="left">`** — infinite horizontal scroll, pure CSS animation (no JS), pauses on hover. Default 30s, accepts any speed and either direction. **No production pages were changed**; existing landing/pricing/FAQ/blog still render exactly as they did.

## 2026-04-26

**Design system foundation (phase 1 of marketing redesign).** Setting up the type scale and palette for the upcoming design-studio-style landing page rebuild — no visible page changes yet, the existing landing page still renders dark because its inline styles override the new defaults. What landed: (1) **Three new fonts loaded:** Fraunces (variable serif, with the ss01 stylistic set on for the wonky 'g' and 'a' alternates), Inter Tight (sans body), and JetBrains Mono (caption mono). (2) **Tailwind v4 design tokens** (`@theme` in `index.css`): cream `#FAF8F5`, ink `#1A1A1A`, accent `#5B7C99`, muted `#6B6B6B` — usable as `bg-cream`, `text-ink`, etc. Type scale: `text-display` (giant, fluid), `text-h1`, `text-h2`, `text-caption`, `text-base`. Letter spacing: `tracking-tight` and `tracking-wide`. Font families: `font-display`, `font-sans`, `font-mono`. (3) **Global base styles:** body bg cream, ink text, Inter Tight at 16/1.7; selection flips to ink-on-cream; smooth scroll; no horizontal overflow. (4) **`Container` component** — 1440px max width, generous gutters (24/48/80px responsive), 12-column grid with 24/32px gap, ready for phase-2 sections to slot into. App and auth views are unaffected — they set their own backgrounds and ignore body cream.

**Marketing pages: less SaaS-template, more designer-built.** Three changes across the homepage, pricing, FAQ, and blog pages: (1) **Custom cursor.** Hover anywhere on a marketing page and a small steel-blue dot follows your mouse with a soft trailing ring; over a button or link, the ring grows and a tiny ↗ arrow pops inside. Desktop only — touch devices are untouched. (2) **New display font: Fraunces.** The Georgia serif used for every headline ("Run your roster…", "Simple, transparent pricing.", FAQ questions, blog titles, etc.) is now Fraunces — an editorial variable serif with optical-size and softness axes, dialed up on the big hero so the letterforms feel hand-drawn. Italic accent on the second hero line ("Not your inbox.") and the CTA. (3) **Scroll-reveal motion.** The hero now fades and lifts in on load (headline → subhead → buttons, staggered). As you scroll down, the app showcase, feature blocks, pricing cards, and FAQ tiles each fade and slide up into view instead of hard-cutting. Respects `prefers-reduced-motion`. The app itself is unchanged — only marketing pages.

## 2026-04-24

**Birthday greetings, team-wide.** Settings → Profile now has a Birthday date field. On the day that matches anyone's birthday in your org, every team member's dashboard reads "Happy Birthday, [name]" — overriding holidays and the normal time-of-day greeting. Multiple birthdays on the same day combine: "Happy Birthday, Cherie & John" for two, "Happy Birthday, Cherie, John & Sarah" for three or more. Birthday cue stops on the next day. Existing members start with the field blank — fill it in any time. (Required one-time Supabase setup: `birthday` column on `profiles`.)

**Dashboard hero: fun fact in line with the greeting.** The fun-fact pull-quote now sits on the same horizontal row as "Good evening, [name]" — date label above, greeting + pull-quote sharing the row baseline-aligned, task counts below. Tighter vertical stack means the hero is shorter and the task buckets get more breathing room.

**Dashboard footer pinned to the visible bottom.** The "Pick a brand/client on the left for the full board" helper and the Assigned/Watching legend now sit together in a sticky footer pinned to the bottom of the visible dashboard frame. They stay at the bottom of the page in the DOM (so they don't crowd the hero), but you no longer have to scroll past your tasks to see them — they're always anchored to the visible bottom edge.

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
