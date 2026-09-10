const { createClient } = require('@supabase/supabase-js')

// Pulls what Instagram will publicly tell us about a creator, from their handle
// alone, so the talent one-pager fills itself in instead of being typed by hand.
//
// This uses Meta's official Business Discovery endpoint, which reads another
// public Business/Creator account through an Instagram account WE own. It
// returns follower count and the like / comment / view counts on recent posts —
// and nothing else. Reach, impressions, story metrics and audience demographics
// are deliberately NOT available here: they exist only inside the creator's own
// Insights and require that creator to authorise us directly. No paid data
// vendor changes that; they sell estimates. So this function fills four fields
// and leaves the rest for a human, which is the honest split.
//
// Requires two Netlify env vars (see docs/instagram-metrics-setup.md):
//   IG_ACCESS_TOKEN  – long-lived token for the Facebook user who owns the app
//   IG_BUSINESS_ID   – the Instagram Business Account id the lookups run through
//   IG_ALLOWED_ORG_ID – (optional) the one org allowed to use it; see the gate below
// With either missing we return { configured:false } so the UI can show a
// "connect Instagram" note rather than an error.

const GRAPH_VERSION = 'v21.0'
// How many recent posts to average over. 25 is the endpoint's practical page
// size and roughly a month of posting for an active creator.
const MEDIA_COUNT = 25

exports.handler = async (event) => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json(401, { ok: false, reason: 'no_auth' })
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return json(401, { ok: false, reason: 'bad_auth' })

  // Every lookup runs through ONE Instagram account we own, on Meta's Standard
  // Access — which covers "your own account or accounts you manage" and does not
  // cover serving other agencies' lookups through our token. Letting every HQue
  // customer pull through it would be outside those terms and risks the app
  // being banned, so access is restricted to our own org until the app has
  // Advanced Access (see docs/instagram-metrics-setup.md).
  //
  //   IG_ALLOWED_ORG_ID – the org allowed to pull. Unset = platform admins only.
  // Widen this only once App Review has granted Advanced Access.
  const allowedOrg = process.env.IG_ALLOWED_ORG_ID
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).maybeSingle()
  let permitted = false
  if (allowedOrg) {
    permitted = profile?.org_id === allowedOrg
  } else {
    const { data: admin } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
    permitted = !!admin
  }
  if (!permitted) return json(200, { ok: true, configured: false, reason: 'not_permitted' })

  const accessToken = process.env.IG_ACCESS_TOKEN
  const businessId = process.env.IG_BUSINESS_ID
  if (!accessToken || !businessId) return json(200, { ok: true, configured: false })

  // Strip a pasted @, a full profile URL, or a trailing slash down to the handle.
  const raw = (event.queryStringParameters || {}).handle || ''
  const handle = raw.trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .trim()
  if (!handle || !/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    return json(400, { ok: false, configured: true, error: 'That doesn’t look like an Instagram username.' })
  }

  // Meta keeps changing which media fields Business Discovery will return for
  // an account you don't own — view_count in particular comes and goes. Asking
  // for a field it no longer serves fails the WHOLE request, so try the richer
  // shape first and quietly fall back to the fields that have always worked.
  const mediaFields = (withViews) =>
    `like_count,comments_count,media_product_type,media_type,timestamp${withViews ? ',view_count' : ''}`
  const buildUrl = (withViews) => {
    const fields = `business_discovery.username(${handle}){followers_count,media_count,media.limit(${MEDIA_COUNT}){${mediaFields(withViews)}}}`
    return `https://graph.facebook.com/${GRAPH_VERSION}/${businessId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`
  }

  try {
    let res = await fetch(buildUrl(true))
    let body = await res.json()
    if (body.error && /nonexisting field|does not exist on|Tried accessing nonexisting field/i.test(body.error.message || '')) {
      res = await fetch(buildUrl(false))
      body = await res.json()
    }

    if (body.error) {
      // Meta's own message is the useful one here, but a few are worth
      // translating because they're the ones a non-developer will actually hit.
      const m = body.error.message || 'Instagram returned an error.'
      const code = body.error.code
      if (code === 190) return json(200, { ok: false, configured: true, error: 'The Instagram access token has expired. It needs regenerating — see the setup steps.' })
      if (/does not exist|cannot be loaded|Invalid user id/i.test(m)) {
        return json(200, { ok: false, configured: true, error: `Instagram has no public Business or Creator account called @${handle}. Personal accounts can’t be looked up.` })
      }
      if (code === 4 || code === 17 || code === 32 || /rate limit/i.test(m)) {
        return json(200, { ok: false, configured: true, error: 'Instagram’s hourly lookup limit is used up. Try again in an hour.' })
      }
      return json(200, { ok: false, configured: true, error: m })
    }

    const bd = body.business_discovery
    if (!bd) return json(200, { ok: false, configured: true, error: `Couldn’t read @${handle}.` })

    const followers = Number(bd.followers_count) || 0
    const posts = (bd.media?.data || []).filter(Boolean)

    // Engagement = likes + comments, averaged across every recent post.
    const engagements = posts.map(p => (Number(p.like_count) || 0) + (Number(p.comments_count) || 0))
    const avgEngagement = engagements.length ? Math.round(sum(engagements) / engagements.length) : null

    // Views only exist on video posts, so average those separately — mixing in
    // stills would drag the number down and misrepresent the creator.
    // If the fallback above dropped view_count, this is simply empty and the
    // field stays blank for a human to fill — never a fabricated zero.
    const videoViews = posts
      .filter(p => p.media_type === 'VIDEO' || p.media_product_type === 'REELS')
      .map(p => Number(p.view_count) || Number(p.play_count) || 0)
      .filter(v => v > 0)
    const avgViews = videoViews.length ? Math.round(sum(videoViews) / videoViews.length) : null

    // Follower-based engagement rate — the standard public formula. This is NOT
    // the reach-based rate a media kit usually quotes (reach is private), so the
    // UI labels it plainly rather than passing it off as the same number.
    const engagementRate = followers && avgEngagement !== null
      ? Math.round((avgEngagement / followers) * 10000) / 100
      : null

    return json(200, {
      ok: true,
      configured: true,
      handle,
      followers,
      posts_sampled: posts.length,
      metrics: {
        avg_engagement: avgEngagement,
        avg_views: avgViews,
        engagement_rate: engagementRate,
      },
      // Named so the UI never implies we fetched more than we did.
      not_available: ['avg_story_reach', 'avg_story_views', 'avg_link_clicks', 'reach_engagement_rate', 'audience'],
    })
  } catch (e) {
    console.error('instagram-metrics error:', e.message)
    return json(200, { ok: false, configured: true, error: e.message })
  }
}

const sum = (a) => a.reduce((t, n) => t + n, 0)

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}
