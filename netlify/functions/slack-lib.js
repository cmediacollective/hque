// Shared Slack posting for the Settings → Integrations feature.
//
// A company connects one Incoming Webhook pointed at a channel (usually #hq).
// HQue posts exactly two kinds of message there — a task was assigned, and a
// task is overdue — each @-tagging the person it concerns.
//
// Every caller runs with the service key, because org_integrations is locked
// away from the browser: the webhook URL is a bearer secret.

// Slack's mrkdwn treats these three characters specially, so escape them
// before dropping a task title or someone's name into a message.
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Returns the org's Slack settings, or null when they haven't connected or
// have switched it off.
async function getSlackConfig(supabase, orgId) {
  if (!orgId) return null
  const { data } = await supabase
    .from('org_integrations')
    .select('webhook_url, enabled, notify_assignments, notify_overdue')
    .eq('org_id', orgId).eq('provider', 'slack').maybeSingle()
  if (!data || !data.webhook_url || data.enabled === false) return null
  return data
}

// How to address someone in the channel: a real @-mention when we know their
// Slack member ID, otherwise their name in bold. Without the ID the message
// still reads correctly — it just doesn't buzz their phone.
async function mentionFor(supabase, orgId, userId, fallbackName) {
  const name = `*${esc(fallbackName || 'Someone')}*`
  if (!orgId || !userId) return name
  const { data } = await supabase
    .from('org_members').select('slack_user_id')
    .eq('org_id', orgId).eq('user_id', userId).maybeSingle()
  return data && data.slack_user_id ? `<@${data.slack_user_id}>` : name
}

// Task title, its Brand/Client, and the company it lives in — everything the
// message needs beyond the person.
async function taskContext(supabase, taskId) {
  if (!taskId) return null
  const { data: task } = await supabase
    .from('tasks').select('id, title, due_date, board_id, org_id').eq('id', taskId).maybeSingle()
  if (!task) return null

  let brandName = ''
  if (task.board_id) {
    const { data: board } = await supabase.from('boards').select('brand_id').eq('id', task.board_id).maybeSingle()
    if (board && board.brand_id) {
      const { data: brand } = await supabase.from('brands').select('name').eq('id', board.brand_id).maybeSingle()
      brandName = (brand && brand.name) || ''
    }
  }
  return { ...task, brandName }
}

function prettyDate(ymd) {
  if (!ymd) return ''
  return new Date(ymd + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// The link carries the company the task lives in, so someone who belongs to
// several lands in the right one instead of an empty Workspace.
function taskLink(taskId, orgId) {
  return `https://h-que.com/?task=${encodeURIComponent(taskId)}${orgId ? `&org=${encodeURIComponent(orgId)}` : ''}`
}

// Best-effort by design: Slack being down or a webhook being revoked must never
// break the thing that triggered the message (assigning a task, the nightly job).
async function postSlack(webhookUrl, text) {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, unfurl_links: false }),
    })
    if (!res.ok) console.error('slack-lib: Slack rejected the post', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('slack-lib: post failed', e)
    return false
  }
}

// ── The two messages ─────────────────────────────────────────────────────────

async function postAssignment(supabase, { taskId, assigneeId, assigneeName, assignedByName }) {
  const task = await taskContext(supabase, taskId)
  if (!task) return false
  const cfg = await getSlackConfig(supabase, task.org_id)
  if (!cfg || !cfg.notify_assignments) return false

  const who = await mentionFor(supabase, task.org_id, assigneeId, assigneeName)
  const meta = [task.brandName, task.due_date ? `Due ${prettyDate(task.due_date)}` : '']
    .filter(Boolean).map(esc).join(' · ')

  const text = [
    `:pushpin: ${who} was assigned *${esc(task.title)}*${assignedByName ? ` by ${esc(assignedByName)}` : ''}`,
    meta,
    `<${taskLink(task.id, task.org_id)}|Open task →>`,
  ].filter(Boolean).join('\n')

  return postSlack(cfg.webhook_url, text)
}

async function postOverdue(supabase, { task, assigneeId, assigneeName, brandName }) {
  const cfg = await getSlackConfig(supabase, task.org_id)
  if (!cfg || !cfg.notify_overdue) return false

  const who = await mentionFor(supabase, task.org_id, assigneeId, assigneeName)
  const text = [
    `:rotating_light: *Overdue* — ${who} has *${esc(task.title)}* past its deadline`,
    [brandName, task.due_date ? `Was due ${prettyDate(task.due_date)}` : ''].filter(Boolean).map(esc).join(' · '),
    `<${taskLink(task.id, task.org_id)}|Open task →>`,
  ].filter(Boolean).join('\n')

  return postSlack(cfg.webhook_url, text)
}

module.exports = { esc, getSlackConfig, mentionFor, taskContext, taskLink, prettyDate, postSlack, postAssignment, postOverdue }
