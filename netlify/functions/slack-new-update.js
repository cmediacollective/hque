// Posts a short internal "New update" heads-up to the marketing Slack channel
// whenever a roadmap item first goes public. Best-effort: called from the
// master-admin's browser; failures never block the roadmap change.
//
// Requires one Netlify environment variable:
//   SLACK_WEBHOOK_URL — an Incoming Webhook URL for #h-que-int-feedback
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  const WEBHOOK = process.env.SLACK_WEBHOOK_URL
  if (!WEBHOOK) {
    console.error('slack-new-update: SLACK_WEBHOOK_URL not set')
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'not_configured' }) }
  }

  try {
    const { title, description } = JSON.parse(event.body || '{}')
    const sentence = (description && description.trim()) ? description.trim() : (title || 'A new update is live.')
    const text = `:sparkles: *New update:* ${sentence}\n<https://h-que.com/updates|See the roadmap →>`

    const resp = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (resp.ok) return { statusCode: 200, body: JSON.stringify({ ok: true }) }
    const errText = await resp.text()
    console.error('slack-new-update: Slack error', resp.status, errText)
    return { statusCode: 200, body: JSON.stringify({ ok: false }) }
  } catch (e) {
    console.error('slack-new-update: exception', e)
    return { statusCode: 200, body: JSON.stringify({ ok: false }) }
  }
}
