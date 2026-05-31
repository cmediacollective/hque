# HQue Changelog

A plain-English log of everything shipped. Newest at the top.

---

## 2026-05-30

**Overdue tasks now stand out on the Workspace board.** Any task with a due date in the past — and not already in a Done column — gets a 3px muted-terracotta (#B85A52) accent on the left edge of the card. Cards in Done columns stay as-is even if their date is past (it shipped, it's not overdue anymore). The rest of the card styling is unchanged. Applies on both the kanban board view and the list view.

**FAQ page redesigned to match the rest of the marketing site.** The /faq page used to feel like a different site — left-aligned hero, a floating "support@h-que.com" callout in the top right, and a two-column accordion. It now mirrors the Pricing page exactly:
- Hero is centered: "SUPPORT" eyebrow + "Frequently asked questions." headline + a short subline.
- The two-column accordion is now a single centered column. The "+" expand icon stays on the right.
- "Still have questions?" lives as a centered block under the accordion with a clear "Contact Support →" button instead of a floating callout in the header.
- Added a full-width "Ready to get started?" CTA section above the footer (14-day free trial, "Start Free Trial →" button).
- Replaced the bare one-line footer with the full site footer (logo + tagline, Product/Resources/Legal columns, italic "Made for people who work with talent." bottom line).
- The nav now shows the "Sign in" link (wired to the same login flow used on the homepage). Same "Start free" button as everywhere else.
- All eight FAQ questions and answers are unchanged — only the layout and structure changed.

**Demo section: reordered slides, slide-specific eyebrows, and a caption.** Tweaks to the homepage product demo (id `how-it-works`):
- Reordered the slides so Reports leads, then Talent Database, Campaigns, and Workspace last. Sidebar nav follows the new order.
- Each slide now shows a small slide-specific eyebrow above the title — "Your business at a glance", "Your full roster, one place", "Every deal, every status", "The work, organized". Same eyebrow style as elsewhere on the page; the existing "Nova Talent Group" workspace name stays above it.
- Added a single body-copy caption *below* the browser frame that changes with the active slide and fades in (~0.3s) on each transition. Mobile slides now drive the same caption — moved the mobile slide state up to the parent so the caption stays in sync no matter which device.

**Pricing page refresh.** Several updates to /pricing:
- Renamed the top tier from "Agency" to **Business** everywhere on the page.
- Rewrote all three tier descriptions to speak to entrepreneurs, agencies, and brand teams (matches the language used on the homepage).
- Bumped body copy on the pricing cards (tier descriptions + feature list items) to #DCDCDC so the text reads cleanly against the dark cards — same standard used on the homepage and blog.
- Filled in the FAQ answers with full plain-English copy, and renamed "Do you offer discounts for smaller agencies?" to "Do you offer discounts?" with broader-audience wording.
- Page title now reads "HQue Pricing — Plans for Agencies, Brands & Entrepreneurs".
- Replaced the thin one-line footer ("© 2026 HQue ← Back to home") with the full footer used elsewhere on the site: logo + tagline ("The CRM and workspace for agencies, brands, and entrepreneurs who work with talent."), Product/Resources/Legal columns, and the italic "Made for people who work with talent." bottom line.

**Green removed; blog grid now uniform 3 columns.** Two fixes:
- Reverted the "Start free" nav button across the site back to the steel-blue #5b7c99 used by the homepage hero CTA. Replaced the active filter pill on the blog page's green fill with a clean white-on-dark inversion (cream fill #F0ECE6 with dark text #0E0E0E) so it reads as "selected" without introducing a new color.
- Unified the post grid below the featured hero into a single 3-column layout — same gutter, same image height, same card height (cards stretch in their grid cells). The previous mixed layout (3-col row + asymmetric 5fr/8fr row + 4-col bottom row) is gone, and the orphan card that used to sit alone on the last row is now centered with a clean 1-up or 2-up flex row when the post count doesn't divide evenly into 3. The mid-page CTA banner stays where it was, between cards 6 and 7.

**The Pitch blog index — readability + simpler hover + green nav CTA.** Five focused changes:
- Removed the "X min read" text from every post card (hero and small cards). Each card now shows just the category and the date.
- Bumped the category label on all cards (hero, 3-col, 4-col) up to a more readable 11px so it's not microscopic. Letter-spacing and caps treatment unchanged. Dates nudged up slightly to stay in proportion.
- Body/excerpt text on every post card switched from gray (#888) to #DCDCDC so the descriptions read cleanly against the dark cards. Headings, category labels, and date colors unchanged.
- Replaced the cursor-tracking spotlight hover effect on the cards (image opacity changes, scale, glow, fade-in "Read article →") with a simple `translateY(-4px)` lift on hover. "Read article →" is now permanently visible on every card. Same treatment applied to the featured hero card.
- "Start free" nav button across the marketing site (homepage, blog, etc.) is now green (#5C9E52) to match the active filter pill on the blog page.

**The Pitch blog index — refreshed copy, category filters, CTA, newsletter.** A focused pass on /blog:
- Updated browser tab + SEO title to "The Pitch — Strategy, Operations & Playbooks for Agencies, Brands & Entrepreneurs | HQue" and the subhead next to the page title to the new agency/brand/entrepreneur language.
- Rewrote the excerpts on "How to Build a Creator Roster From Scratch" and "The State of Creator Marketing in 2026" and enabled excerpt display on the portrait card and the bottom-row cards so the new subheadlines actually show on the page.
- Added a row of category filter pills (All, Agency Operations, Campaign Management, Talent Strategy, Brand Partnerships, Industry) just under the page hero. Active pill is filled green; inactive pills are outlined. Filtering is instant and client-side.
- Added a publish date row under the category line on each card (and on the hero featured post), formatted as the existing data ("Month DD, YYYY").
- Inserted a "READY TO RUN IT?" CTA banner between the portrait/wide row and the bottom row of small cards, with Start Free Trial → /signup and See Pricing → /#pricing.
- Added a "THE PITCH · IN YOUR INBOX" newsletter capture strip above the footer. Submit POSTs the email + a "Blog Subscriber" first-name tag to the Google Sheets endpoint (text/plain, fire-and-forget). On submit the form replaces with "You're in. We'll be in touch."
- Footer tagline updated to "The CRM and workspace for agencies, brands, and entrepreneurs who work with talent.", bottom line changed to italic "Made for people who work with talent.", and the footer logo no longer has a 50% opacity wash.

**Chat widget: first name added back to email capture.** The chatbot's email gate now asks for a first name in addition to the email. The first name is optional (only email is validated/required); both fields are submitted to the Google Sheet so future Klaviyo or other tooling has names to work with. First name is also saved locally for any future personalization needs.

**Chat widget: emails now go to Google Sheets, and the gate is reliable.** Two fixes:
- On submit, the email is POSTed to a Google Apps Script endpoint that appends to a Google Sheet (Content-Type: text/plain to avoid CORS preflight). It's fire-and-forget — the user immediately transitions to the topic list whether the request succeeds or fails. This replaces the previous Mailchimp call.
- The "have they already submitted email?" check is now driven by a dedicated `hque_chat_email_submitted` localStorage flag, set only when the form is actually submitted. Stale data from older chat sessions (which used different keys) no longer accidentally lets visitors skip the gate.

**Chat widget rebuilt as a topic-based flow.** The homepage chatbot no longer takes free-text input. Instead:
- First open shows a required email capture ("Before we dive in —" / "Drop your email and we'll send you helpful resources, tips, and updates from HQue."). Email is validated for format and then submitted to Mailchimp via the existing function. "No spam. Unsubscribe anytime." sits under the button.
- After submitting, the user sees a greeting and eight tappable topic buttons: What is HQue?, Who is it for?, How does pricing work?, Is there a free trial?, What types of talent can I manage?, How is this different from a spreadsheet or CRM?, Can my whole team use it?, Talk to support.
- Each topic opens a curated answer with relevant CTA buttons at the bottom (Start Free Trial → /signup, See Pricing → /#pricing, or Email Support → mailto:support@h-que.com). A "← Back" link returns to the topic list.
- Header keeps the "HQue Assistant" label and now shows a green "● Online" indicator.
- The previous LLM-backed free-text chat is no longer reachable from the UI; the underlying chat function is left in place for now.

**Closing CTA "READY?" eyebrow now visible.** The "READY?" label above the "Your team deserves a better tool." headline was getting hidden by the section's gradient overlay (an absolutely-positioned background that, per CSS paint order, was rendering on top of the eyebrow). The eyebrow, headline, and button now sit explicitly above the overlay so the eyebrow renders in the same small-caps blue style as every other section label on the page.

**Footer bottom tagline no longer clips.** "Made for people who work with talent." in the bottom right of the footer was getting cut off at narrower desktop widths. It's now set to never wrap mid-line and never shrink — if there isn't room next to the copyright, it drops cleanly to the next line instead.

**Marketing pricing cards now align.** The three pricing cards on the homepage now stretch to the same height and all three "Get started" buttons sit on the same baseline at the bottom — previously the Business tier sat lower because it has an extra feature. The features list keeps its natural position under the price; the extra space sits between the features and the button.

**Marketing homepage: lighter body copy.** Bumped all paragraph and descriptive body text across the marketing homepage to #DCDCDC for better readability against the dark background. Hero subhead, persona descriptions, feature bodies, pricing tier descriptions and feature lists, FAQ answers, trust lines, and footer taglines are all included. Headings, eyebrow labels, buttons, nav links, and pill tags are unchanged.

**Marketing homepage refresh — copy + structure.** A focused pass across the marketing page to widen the audience message (agencies, brands, *and* entrepreneurs) and tighten the hierarchy:
- Page title now reads "HQue — Talent & Campaign Management for Agencies, Brands & Entrepreneurs" (browser tab + SEO).
- Nav has a third link, **The Pitch**, pointing at /blog.
- Hero adds an eyebrow ("THE PLATFORM BUILT FOR TALENT-DRIVEN WORK") above the headline. Subheadline rewritten to speak to all three audiences. "See how it works" anchors to the new product section.
- New **Built For** section between the hero and the product screenshots, with three columns — Agencies, Brand Teams, Entrepreneurs.
- The product screenshots area now has a section eyebrow ("THE PLATFORM") and a real headline ("One platform. Every part of the deal."). Anchor id #how-it-works added.
- **Features** section gets a proper headline ("Built for the way talent work actually runs.") and refreshed copy on all three feature blocks.
- New **Talent Types** section between Features and Pricing, with the headline "Built for every type of talent.", a body line listing actors / UGC / influencers / speakers / etc., and a row of pill tags.
- **Pricing**: each tier now has a one-line description, the third tier renamed from "Agency" to **Business**, and the Get Started buttons link to /signup?plan=starter|pro|business.
- **FAQ**: rewrote the "Who is HQue for?" and "Can my whole team use it?" answers (with Business replacing Agency in the seats line).
- **Footer**: new tagline under the logo ("The CRM and workspace for agencies, brands, and entrepreneurs who work with talent.") and a small italic tagline at the very bottom ("Made for people who work with talent.").

No visual styles, colors, fonts, spacing, or animations were changed — just copy and structure.

---

## 2026-05-29

**Reports: month filter and cleaner status cards.** Next to the year chips there's now a Month dropdown — pick a specific month and the status counts, payment totals, and campaign list scope to just that month. The two charts still show the full 12-month year so you keep context, but the selected month is highlighted (and the other months dim back). Also removed the colored left bar on the status cards at the top — they're cleaner now and the status name itself carries the color.

**Reports section revamped.** The Reports page is now organized around a year you pick at the top (defaults to this year, with a chip for every year you have campaigns in). What's new:
- A row of cards across the top showing how many campaigns of each status — Pitch, Contract Pending, Active, Pending Payment, Completed, Cancelled, Dead — happened in the selected year. Each card is color-coded to match the status color used elsewhere.
- A new **Campaign Activity by Month** chart: one stacked bar per month, height = number of campaigns that started that month, colored bands inside the bar showing how many landed in each status. A legend below makes it easy to read.
- The existing **Budget by Month** chart and the campaign list now also respect the selected year. Archived campaigns are included throughout, so nothing drops out of the report just because it was hidden from the active list.
- Payments and Total Talent moved into smaller cards below the main charts.

**Two new campaign statuses: Contract Pending and Dead.** Contract Pending sits between Pitch and Active (use it for campaigns where you've agreed in principle but paperwork is still being signed). Dead lives at the bottom of the dropdown for campaigns that didn't pan out and aren't being pursued anymore. Both have their own status colors so they're easy to spot on the Campaigns view.

**Bigger click target on Campaign cards.** Previously you had to click directly on a campaign row to open it, which was a small target. Now clicking anywhere on a brand card opens the first campaign inside it. The brand logo and name still link to the website, and individual campaign rows still open their own campaign — just the empty space around them is now active too.

**Removed the per-row hover highlight on Campaign cards.** Now that clicking anywhere on the card opens it, the gray/tan highlight on the individual campaign row was extra visual noise. The card itself still lifts on hover; the row no longer changes background.

**You can now delete a campaign.** Open a campaign, click Edit, and scroll to the bottom — there's a new "Danger Zone" with a Delete Campaign button. Deleting is permanent and also removes any workspace tasks, talent assignments, and comments tied to that campaign, so you're asked to confirm first. If you might want it back later, Archive (in the campaign header) is still the safer choice.

---

## 2026-05-27

**Brand logo and name on the Campaigns cards link to the website again.** When the Campaigns view switched to one card per brand, the click-through to the brand's website got dropped. It's back: if a brand has a website on file, clicking its logo or name on the campaign card opens the site in a new tab.

**Fixed the duplicate website field in the New Campaign form.** When adding a brand, the form was asking for the website twice — once inside the "+ New brand" box and again in a standalone "Brand Website" field below it. The standalone field now only appears when an existing brand is selected (and you're not mid-way through adding a new one), so you're never asked for the same website twice.

**Added Pride Month to the dashboard greeting.** On June 1, the home dashboard now greets the team with "Happy Pride Month" and a short note about the June 1969 Stonewall origin, alongside the existing rotating holidays and fun facts.

**Lightened up the light theme — less beige.** The light mode had a warm, tan/beige cast across the whole app (especially the left-hand brand menu). Pulled some of the yellow out and lightened every surface a few shades so it reads as a clean warm off-white instead of beige. Backgrounds, cards, borders, hover and selected states all shifted together, so the look stays consistent across the dashboard, workspace, talent, campaigns, reports, and settings.

**Cleaned up the vertical lines on the home dashboard.** The "Assigned" and "Watching" rows had a thin vertical divider running down the left side of the task cards, which looked like a stray red bar in some screenshots. The line is gone — task cards now sit clean against the row label.

---

## 2026-05-25

**Marketing-site demo now looks like the actual product.** The HQue marketing page has a small in-browser demo that cycles through Talent, Campaigns, Workspace, and Reports. It had drifted away from how HQue actually looks today — flat 1px-line tiles, no shadows, no colored column dots, dated chip styling. All four frames (and the mobile phone preview) are now refreshed to match the current platform: raised cards with soft shadows and rounded corners, colored dots in front of each kanban column name (To Do = grey, In Progress = gold, Done = green), the modern filter-chip style with a real "+ Talent" button, and a brand-card layout for Campaigns and Reports. All the original fake accounts (Nova Talent Group and the sample talent/brands/tasks) stay the same.

---

## 2026-05-22

**Travel and Entertainment now show as talent filter categories.** Those two categories could be assigned to a creator (and showed on their talent card), but were missing from the filter chips — so there was no way to filter the roster by them. The filter list now matches the full set of categories used when adding talent.

**All talent filter categories are now visible at once.** The category filter chips (Actor, Sports, Wellness, Beauty, etc.) used to sit in a single row that scrolled sideways — fine with a laptop touchpad, but impossible to reach with a regular mouse, so the categories farther to the right were effectively hidden. On desktop the chips now wrap onto multiple lines, so every category is visible and clickable without any scrolling. (Mobile keeps its swipe-to-scroll row.)

**Broken invite links no longer dump people on the marketing page.** When you invite a teammate, HQue emails them a one-time sign-in link. Those links expire fast and can only be opened once — and sometimes an email provider's security scanner quietly "clicks" the link first, using it up before the person ever gets to it. Until now, that left an invited teammate stranded on the public "Start your free trial" page with no idea what went wrong. Now, a broken or expired link lands them on a clear recovery screen that explains what happened and lets them request a fresh link in one step — using the same email their invitation was sent to.

---

## 2026-05-20

**Notes work as a running log.** The brand-notes editor now keeps a true running log: when you open a note on a new day and start typing, a fresh heading for *today* (in your agency's time zone) is inserted at the very top, with yesterday's section preserved right below. If today's heading already exists, your additions merge into it. This also fixes the underlying cause of headings drifting into "tomorrow" — everyone on the team now agrees on what "today" means based on the agency's time zone, not each person's browser clock.

**"NEW" badge on the Notes button.** When a brand's notes have been edited recently, the Notes button now shows a small green NEW pill so anyone on the team can see at a glance that there's something new to read for that brand. The badge clears for you the moment you open the notes, and disappears for everyone 48 hours after the last edit even if no one opened it.

**Notification emails open the right thing.** The "Open" button in HQue's notification emails used to drop you on the HQue home — you'd then have to hunt for the task or campaign the email was about. Now the button deep-links straight to the specific task ("Open task") or campaign ("Open campaign") that the notification refers to.

**Clickable links in task descriptions.** Open any task and the description now shows links as actual clickable links (URLs, emails, @mentions). Clicking a link opens it; clicking the rest of the description switches into edit mode so you can keep editing as before. Task comments were already clickable; descriptions now match.

---

## 2026-05-19

**Workspace toolbar buttons stand out more.** The Notes button now has a blue outline so it reads as a real button, and the Kanban / List toggle is a crisper segmented control with a filled background and a soft shadow — both no longer look flat against the page.

**Daily tip on the dashboard reads cleaner.** The "Did you know? / Fun fact / Tip" line on the Workspace dashboard used to have a blue line running down its left side. The line is now a short blue underline *under* the intro ("Did you know?", "Fun fact:", etc.), with the rest of the tip flowing below it. Reads more like a heading.

**Sort tasks by due date or priority.** The Workspace board (and List view) now has a "Sort" dropdown in the toolbar. Pick *Due date* and within each column the soonest-due tasks bubble to the top; pick *Priority* to put High → Medium → Low; pick *Default* to leave them in the order they were created. Your choice is remembered. (Drag-and-drop between columns still works as before.)

**Workspace notes: highlighting, deleting a date, and date order.** Three fixes to the brand notes:
- *Highlighting now shows.* Selecting text in a note used to highlight invisibly (a dark highlight on the dark notes background), so it looked like nothing happened. Selected text now shows a clear blue highlight, so you can see what you've grabbed to copy or delete.
- *Delete a whole date.* Hover any date heading in a note and a × appears — click it to remove that date and all of its notes at once (with a confirmation first).
- *Dates no longer go backwards.* A new date heading is only created when it's genuinely newer than the latest one already in the note; otherwise your additions go under the existing top heading.

**Header buttons stand out.** The top-right buttons — Dark/Light, the notification bell, Export, and + Talent — are no longer flat. The first three now have a filled background, rounded corners and a soft shadow, and the + Talent button has a blue glow, so the toolbar reads as real, tappable buttons.

**Sidebar view toggles match.** The Grid / List (and Grid / List / Board) toggle in the left sidebar is now the same crisp segmented control — filled background, rounded corners, soft shadow, and the active view in blue — so it matches the Workspace toggle.

**Kanban columns pop, and the Done column is no longer hidden.** Each column on the Workspace board is now a proper raised panel — its own background, rounded corners, a soft shadow, and a clearer header with a small color dot and a count badge. The dot colors follow the stage: Hold is red, Review is blue, In Progress is amber, Done/Complete is green, and To Do is grey. And the rightmost "Done" column, which used to sit off-screen where you couldn't tell it existed, now shows as a slim always-visible strip at the edge of the board (its name runs vertically with a task count). Click the strip to expand it to a full column, and the › button in its header to collapse it again — so Done is always visible without shrinking any of the other columns.

**Cards stand out across the app.** The brand cards in the Campaigns grid, the talent cards in Talent, and the task cards in Workspace (both the board and list views) no longer sit flat against the page — each is now a raised card with rounded corners, a soft shadow, and a little spacing around it, and it gently lifts when you hover over it. On the campaign cards, the talent photos are also a touch larger and sit neatly in the top-right corner of each campaign.

**Mini calendar in the sidebar.** A small month calendar now sits right in the left menu. The current month shows by default with today's date highlighted, and small arrows let you glance back at past months or ahead to future ones. "Today" is determined by your agency's time zone setting (Settings → org time zone), so it's correct no matter where the person viewing it is located. The month and year are in HQue's brand blue and serif font. It's purely a quick reference — nothing is plotted on it and nothing is booked.

**Invited team members can reliably join.** Previously, when someone you invited signed in, the step that attaches them to your agency could quietly fail while the invitation was still marked "accepted" — leaving that person stuck forever on the "Create your agency workspace" screen with no way out. Joining an agency now happens in one atomic server-side step: the invitation is only consumed once the person is successfully attached, so a half-failed join can't strand anyone. The onboarding screen also now has a "Sign out" button as a safety net, plus a note reminding invitees to sign in with the exact email their invite was sent to.

**Cleaner brand campaign cards.** The campaign lines inside each brand card had too many divider lines. A brand with a single campaign now shows no separator line at all, and a brand with several campaigns shows just one thin line between each — so the cards read cleaner.

---

## 2026-05-18

**Campaigns are grouped into one card per brand.** The campaign grid now shows one card per brand/client — the brand's logo and name once at the top with a roll-up (number of campaigns, total budget), and that brand's campaigns listed inside the card. Cards flow in the grid like before, so there's no dead space, and a brand with several campaigns simply shows them all stacked in its card — a running history. Each campaign line shows type, status, budget, dates, contact and talent, with status/type editable inline; click a line to open the campaign. Within a brand, campaigns are ordered newest-first.

**Campaign cards now show the contact.** The campaign cards (grid view) and rows (list view) now display the campaign's point of contact alongside the brand, status, budget, and date range — so you can see who you're dealing with without opening the campaign. (Phase 2 of the campaign CRM work.)

**Brands now keep a roster of contacts, and each campaign picks one.** A brand/client can hold as many contacts as you need — name, title, email, phone, notes — managed on the brand screen, with one starred as the primary. Each campaign then picks which contact it's dealing with from that brand's roster (defaulting to the primary), so different campaigns with the same brand can have different points of contact. The campaign detail screen shows that campaign's chosen contact. (Phase 1 of the campaign CRM work.)

**The site loads faster.** The whole app used to download as one 877 KB file before anything could show — including the marketing pages app users never see, and all the app screens marketing visitors never see. It's now split into on-demand pieces: the main file dropped to ~243 KB, and each screen (Campaigns, Reports, Settings, etc.) loads only when you actually open it. First load is noticeably lighter. The dashboard and brand sidebar were also reworked to run their database lookups in parallel instead of one after another, so those screens fill in faster.

**Brand/client logos are a bit larger.** The square logo thumbnails in the sidebar, workspace brand header, edit-brand screen, and Reports were bumped up slightly so they're easier to see.

**The dashboard now shows tasks with no due date.** Your "My Tasks" dashboard used to only show tasks due within the next two weeks (Today / This Week / Next Week), so a task with no due date — or one due further out — was invisible even though it counted toward your "assigned / watching" totals. There's now a fourth column, **"Later / No date"**, that catches every one of those, for both Assigned and Watching.

**Team invites now show as "Pending" and let you set an access level.** On Settings → Team, when you invite someone you now pick whether they join as a Member or an Admin, right next to the email field. Anyone you've invited who hasn't accepted yet appears in a new "Pending Invitations" list with a Pending badge — so you can confirm the invite went out — and you can cancel a pending invite if you sent it by mistake.

**You now auto-follow tasks you're assigned to or mentioned in.** Anyone assigned to a task, or @-mentioned in the task or one of its comments, automatically becomes a watcher of that task — so they keep getting updates without having to add themselves. (No extra "you're now watching" email; you just get the assignment or mention notification.)

**Campaign notifications are now clickable.** When you're @-mentioned in a comment on a campaign, that notification in the bell now opens the campaign — previously those notifications were dead ends. (Needs a one-time database update; see notes.)

**Tasks now send deadline reminder emails.** When a task has a due date and someone assigned to it, that person gets an email: the day before it's due, the day it's due, and the day after if it's still not done. (That's on top of the email they already get when first assigned.) A daily check runs around noon Pacific. Reminders skip tasks that are already in a Done column, and respect each person's email-notifications setting. There's also a preview tool to see the email designs without setting up real tasks.

**The Workspace sidebar now shows every brand/client.** Previously, brands with no tasks yet were hidden behind a small "+N no tasks" link, so a brand someone just added wouldn't appear in the list — you had to search for it. Now every active brand shows in the sidebar all the time. Archived brands are still kept separate under the "+N archived" toggle.

## 2026-05-17

**The homepage pricing section now matches the redesigned cards.** The pricing cards on the homepage got the same refresh as the `/pricing` page — `3px` rounded corners and a cleaner border, a subtle lift on hover, a slate-blue border and soft glow on the "Pro" card, the "Most Popular" label as a tab on the top edge, and a sliding arrow on the "Get started" button. No price changes.

## 2026-05-16

**Refreshed the pricing cards on the marketing site.** The three plan cards (Starter / Pro / Agency) on `/pricing` got a visual update: each card now has a thin border with softly rounded corners and lifts slightly when you hover over it. The "Pro" plan is highlighted with a slate-blue border and a soft glow, and its "Most Popular" label sits as a clean tab on the top edge. The "Start free trial" button gained an arrow that slides on hover, and the "Everything in Starter/Pro" feature rows are subtly emphasized so the tiers read as building on each other. Prices are unchanged ($49 / $99 / $199).

## 2026-05-06

**Workspace page header now says "Workspace"** (was "Brands/Clients"), matching the sidebar label.

## 2026-05-06

**Clearer label in the workspace sidebar.** The "+16 empty" toggle (which hides brands that have no tasks yet) now reads "+16 no tasks" so it's obvious what's being collapsed. Hover for a tooltip too.

## 2026-05-06

**Workspace is now the home view + nav reorder + small fixes.**
- **Workspace is the default landing view.** Sign in / refresh and you go straight to your workspace dashboard instead of Talent.
- **Sidebar reordered:** Workspace → Campaigns → Talent → Reports.
- **Notes date stamps are back.** When you start typing today, today's date heading is inserted at the top of your notes again. (Old timestamps below still get preserved as before.)
- **List button is now a dropdown** with Bulleted / Numbered, instead of two side-by-side buttons.
- **Archived campaigns toggle moved to the page header.** It now lives next to the Dark/Light button, only visible when you're on Campaigns. Click "Archived" → see archived only; the same button reads "Active" while you're there to toggle back to your previous view (grid/list/board).

## 2026-05-06

**Shareable links for brand notes + Archived campaigns view.**
- Each brand's notes now has its own shareable URL. Open notes → click **↗ Copy Link** in the header (top right, next to ×). Paste in Slack/email — anyone with HQue access lands directly in that brand's notes.
- Removed the inline 🔗 Link button from the notes toolbar — pasted URLs already auto-link, so it was just clutter.
- New **Archived** view in the campaigns sidebar (alongside Grid / List / Board). All campaigns you've archived live here; archive an active one and it'll show up in this view automatically.

## 2026-05-06

**More brand notes polish.**
- **Editing past days no longer kills the timestamp.** When you reopen tomorrow and edit something under today's heading, the heading stays put. A new heading for tomorrow only appears at the top when you actually start writing new content above the existing dates.
- **× button on dropped files.** Hover over an embedded image and a small × appears in the top-right; PDFs and other files show a × beside the filename. Click to remove the attachment cleanly. Old attachments dropped before this change get the × treatment automatically the next time you open the notes.
- **Bulleted lists now show bullets.** And there's a new **1. list** button next to it for numbered lists.
- **Strikethrough button** added to the toolbar (next to bold/italic/underline).
- **Text color picker.** Small colored swatch in the toolbar opens a 8-color palette plus a "Default" option to revert to the theme's text color.

## 2026-05-06

**Link previews in brand notes.** Paste a URL into a brand's notes and a preview card appears underneath — image, title, description, source. Click the card (regular click) to open the page in a new tab. Works for any public URL with Open Graph or Twitter card metadata (which is most of the modern web). Powered by a new Netlify function (`/.netlify/functions/link-preview`) that fetches the page and reads its meta tags. Cards are saved with the rest of your notes, so they persist next time you open them.

## 2026-05-06

**Brand notes — major upgrade.** Bunch of improvements based on feedback:
- **Pasted links are now clickable.** Drop a URL into your notes and it instantly becomes a hyperlink. ⌘-click (Mac) or Ctrl-click (Windows) any link to open it in a new tab without leaving the notes.
- **Daily date headings.** When you start typing on a new day, a date heading like "Tuesday, May 6, 2026" appears at the top automatically. Newest at top, older notes flow down.
- **Drag & drop files.** Drop images, PDFs, anything onto the notes window. Images render inline (click to open full-size). PDFs and other files appear as 📎 links you can click to open in a new tab.
- **@-mention your team.** Type `@` and pick a teammate. They get a notification when you save that says "You were mentioned in notes for {brand name}".
- **Theme inversion.** Notes open in light mode if your app is in dark mode (and vice versa) — easier on the eyes when switching contexts.
- **No more accidental closes.** Clicking outside the notes window no longer closes it — only the × button does. Auto-saves while you type (small "Auto-saves as you type" hint up top, plus a "✓ Saved" indicator).
- Removed the confusing "clear" button from the toolbar.

## 2026-05-06

**Rolling notes per brand client.** Open any brand from the workspace sidebar and you'll see a new **✎ Notes** button next to the Kanban / List toggle. Click it to open a document-style window — like a Word doc just for that brand. Bold, italic, underline, bulleted lists, and hyperlinks are all there. Use it for biweekly meeting notes, ongoing context, anything you want to remember about that client. Auto-saves when you click out or close the window. Notes are shared with everyone in your agency. **One-time setup:** run this in Supabase → SQL Editor: `alter table brands add column if not exists meeting_notes text;`

## 2026-05-06

**Shareable links for campaigns.** Open any campaign and you'll see a new **↗ Copy Link** button next to Edit in the header. Click it (turns to ✓ Copied) and paste the link into Slack, email, or anywhere — opening it takes the recipient straight to that campaign panel. Works for archived campaigns too. Behind the scenes, this is just a `?campaign=<id>` URL parameter, the same approach already used for tasks.

## 2026-05-03

**Brand contacts: light CRM on each brand.** Every brand now stores a primary contact (name, title, email, phone) plus free-text notes. Edit from three places: (1) workspace sidebar — hover a brand → ⋯ → **Edit brand** opens a panel with name, logo, website, contact fields, archive button; (2) campaign form brand row — new **Contact** button opens the same panel; (3) campaign detail — small contact block under the brand header with name/title, email (mailto link), phone (tel link). Click the block to edit. Required one-time Supabase setup: 5 columns on `brands` (SQL provided separately).

## 2026-05-03

**Removed the duplicate payment-status row from the talent's campaign list.** The campaign status (Active / Completed / etc.) on the right of each row is now the only badge — no "Payment Pending" / payment method / payment date underneath the brand name. Payment info still lives on the campaign detail's assigned-talent row where it's editable.

## 2026-05-03

**Talent ↔ campaign navigation is seamless.** Clicking a campaign in a talent's detail panel used to close the talent panel. Now the talent panel stays open underneath, and the campaign panel sits on top. Close the campaign (or click the new "← Back to {talent name}" link in the campaign header) and you're right back where you were on the talent.

**The "Pending" badge in the talent's campaign list is now labeled "Payment Pending".** Was confusing because the campaign next to it could be Active or Completed — the "Pending" was about that talent's payment status on the campaign, not the campaign itself. The label now reads "Payment Pending" or "Paid" so there's no ambiguity.

## 2026-05-02

**Click a task on the workspace dashboard to open it directly.** Used to switch you to the brand's board where you'd then have to click the task again to open it. Now one click opens the task panel — useful when you want to delete or edit a task you spotted in the Today / This Week / Next Week buckets without hunting for it on the kanban.

## 2026-05-02

**Workspace sidebar hides brands with no tasks by default.** If a brand has zero tasks, isn't pinned, and isn't currently selected, it's tucked away. A small `+N empty` link near the brand count reveals them again. Search still finds all brands. Pinned brands always stay visible. So you only see what you're actively working on.

## 2026-05-02

**One-time cleanup of leftover auto-tasks.** The first time you open the workspace after this update, any tasks that were auto-created by the old campaign→task feature get deleted. Heuristic: task has a campaign link, no description, and the title exactly matches the campaign name (the auto-task signature). Real tasks you wrote yourself or manually linked won't be touched. This is a one-shot cleanup — runs once per session, idempotent. Reminder: brands themselves can be archived from the workspace sidebar (hover a brand → click ⋯ → Archive brand) to clear them out of your sidebar entirely.

## 2026-05-02

**Campaign type and status are now dropdowns in the campaign form.** Replaced the row-of-button pickers with proper select dropdowns — easier to scan, especially with more options. **Media** added as a new campaign type (now: Paid · Non-paid · Gifting · Seeding · Media). The Media option is also available in the inline dropdowns on the grid card and list view.

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
