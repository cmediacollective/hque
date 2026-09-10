# Connecting Instagram (one-time, free)

This is what makes the **Pull from Instagram** button work on a talent's Edit
screen. It takes about 15 minutes and costs nothing.

You have to do this part yourself — it involves logging into Facebook and
copying an access token, and nobody else should ever handle those.

---

## What you'll get out of it

Once connected, typing a creator's handle and clicking **Pull from Instagram**
fills in:

- Follower count
- Average engagement (likes + comments across their recent posts)
- Engagement rate
- Average views, when Instagram returns them

## What it will never fill in

- Average story reach
- Average story views
- Average link clicks
- Reach engagement rate
- Audience gender and age split

These are not missing because of a setting or a cheaper plan. They exist only
inside the creator's own Instagram Insights, and Instagram does not hand them to
anyone else — not to us, and not to the data companies charging
$16,200 a year either — they sell *estimates* of them. Getting the real numbers means the creator sends
them to you, or authorises HQue directly (a bigger project, see the last
section).

---

## Before you start

You need **an Instagram Business or Creator account** (the C Media Collective
one is fine) **connected to a Facebook Page**. If Instagram is currently a
personal account, switch it in the Instagram app:
Settings → Account type and tools → Switch to professional account.

One important limitation to know now: this only looks up **Business and Creator
accounts**. Creators on personal accounts can't be pulled, and the button will
tell you so rather than failing silently.

---

## Step 1 — Create the Meta app

1. Go to <https://developers.facebook.com/apps> and log in with the Facebook
   account that manages your Page.
2. Click **Create App**.
3. For "What do you want your app to do?", choose **Other**, then **Business**.
4. Name it something you'll recognise later, e.g. `HQue Talent Metrics`.
5. Create it. You'll land on the app dashboard.

## Step 2 — Add the Instagram product

1. In the left sidebar, find **Add product**.
2. Next to **Instagram Graph API** (or **Instagram**), click **Set up**.

## Step 3 — Get your access token

1. Go to <https://developers.facebook.com/tools/explorer> (Graph API Explorer).
2. Top right, in **Meta App**, select the app you just made.
3. Click **Generate Access Token** and log in when asked.
4. When it asks which Pages and Instagram accounts to allow, **tick your Page
   and your Instagram account**.
5. In the **Permissions** box, make sure these are all added:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `pages_show_list`
6. Click **Generate Access Token** again if you changed permissions.
7. Copy the long string in the **Access Token** box. Keep this tab open.

> This first token only lasts about an hour. Step 5 turns it into one that
> lasts about 60 days.

## Step 4 — Find your Instagram Business Account ID

Still in the Graph API Explorer:

1. In the request box, replace whatever is there with:
   `me/accounts?fields=instagram_business_account,name`
2. Click **Submit**.
3. In the response, find your Page by `name`, and copy the `id` shown inside
   `instagram_business_account`. It's a long number.

That number is your **IG_BUSINESS_ID**.

## Step 5 — Turn the token into a long-lived one

1. Go to <https://developers.facebook.com/tools/debug/accesstoken>
2. Paste the token from Step 3 and click **Debug**.
3. Click **Extend Access Token** at the bottom.
4. Copy the new, extended token.

That is your **IG_ACCESS_TOKEN**.

## Step 6 — Add both to Netlify

1. Go to <https://app.netlify.com/projects/hque/settings/env>
2. Click **Add a variable** twice and add:

   | Key | Value |
   |---|---|
   | `IG_ACCESS_TOKEN` | the extended token from Step 5 |
   | `IG_BUSINESS_ID` | the number from Step 4 |
   | `IG_ALLOWED_ORG_ID` | your C Media Collective org id (optional — see below) |

   **About that third one.** Every lookup runs through *your* Instagram account.
   Meta's Standard Access covers you using it for your own agency; it does not
   cover other HQue customers pulling through your token, which would put the
   app at risk of being banned. So the button is switched off for everyone else
   until the app has Advanced Access.

   Leave `IG_ALLOWED_ORG_ID` unset and only master-admin accounts can use it,
   which is the safe default. Set it to your org id to open it to your whole
   team. Don't widen it further until App Review is done.

3. Save, then redeploy (any push deploys automatically, or hit
   **Trigger deploy** in Netlify).

Done. Open any talent, click **Edit**, and the **Pull from Instagram** button
under Performance will work.

---

## Keeping it working

The token expires roughly **every 60 days**. When it does, the button will say
so in plain words: *"The Instagram access token has expired."* Redo Steps 3 and
5, and update `IG_ACCESS_TOKEN` in Netlify.

There's also an hourly lookup cap set by Instagram. If you refresh a large
roster in one go you may hit it; the button will say to try again in an hour.

---

## If you later want the private numbers too

Getting reach, story views, link clicks and real audience demographics means
each **creator** authorises HQue from their own Instagram — they click a link
once, and after that their real Insights flow in.

That needs Meta's **Advanced Access**, which means submitting the app for
review: business verification, a demo video, and roughly 4–6 weeks of waiting.
It's still free. It's much easier to pass once the app above is live and
working, which is the main reason to do this part first.
