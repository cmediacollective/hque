// HTTP endpoint for client-side Klaviyo moves (marketing opt-ins, trial start).
// Server-side events import klaviyo-lib directly instead of calling this.
const { syncStage } = require('./klaviyo-lib')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  try {
    const { email, stage } = JSON.parse(event.body || '{}')
    if (!email || !stage) return { statusCode: 400, body: JSON.stringify({ error: 'email and stage required' }) }
    await syncStage(email, stage)
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    console.error('subscribe-klaviyo error', e)
    return { statusCode: 200, body: JSON.stringify({ ok: false }) }
  }
}
