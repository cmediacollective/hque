// Daily scheduled job: emails task assignees when a task is due tomorrow,
// due today, or overdue (due yesterday). Scheduled via netlify.toml.
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const RESEND_KEY = process.env.VITE_RESEND_API_KEY
const APP_URL = 'https://h-que.com'
const DONE_COLUMN_NAMES = ['done', 'completed', 'complete', 'shipped', 'closed']

// A calendar date (YYYY-MM-DD) in Pacific time, optionally offset by N days.
function pacificDate(offsetDays = 0) {
  const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const d = new Date(ymd + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function prettyDate(ymd) {
  return new Date(ymd + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

// phase: 'tomorrow' | 'today' | 'overdue'  ->  { subject, html }
function buildEmail({ phase, name, taskTitle, brandName, dueYmd, taskId }) {
  const due = prettyDate(dueYmd)
  const variants = {
    tomorrow: {
      subject: `Reminder: "${taskTitle}" is due tomorrow`,
      label: 'Due tomorrow', color: '#5b7c99',
      line: `A heads-up that this task is due <strong>tomorrow</strong> &mdash; ${due}.`
    },
    today: {
      subject: `"${taskTitle}" is due today`,
      label: 'Due today', color: '#b8860b',
      line: `This task is due <strong>today</strong>, ${due}.`
    },
    overdue: {
      subject: `Overdue: "${taskTitle}" needs your attention`,
      label: 'Overdue', color: '#c0392b',
      line: `This task was due on <strong>${due}</strong> and is now past its deadline. Please address it as soon as you can.`
    }
  }
  const v = variants[phase]
  const html = `<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1A1A1A;">
  <p style="font-size:16px;margin:0;">Hi ${esc(name)},</p>
  <div style="margin:18px 0 6px;"><span style="display:inline-block;padding:4px 11px;background:${v.color};color:#fff;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;border-radius:2px;">${v.label}</span></div>
  <p style="font-size:15px;line-height:1.5;margin:10px 0 2px;"><strong>${esc(taskTitle)}</strong></p>
  ${brandName ? `<p style="font-size:12px;color:#888;margin:0 0 12px;">${esc(brandName)}</p>` : '<div style="height:6px;"></div>'}
  <p style="font-size:14px;color:#555;line-height:1.7;margin:8px 0 24px;">${v.line}</p>
  <a href="${APP_URL}/?task=${taskId}" style="display:inline-block;padding:11px 26px;background:#5b7c99;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Open task</a>
  <p style="margin-top:34px;font-size:11px;color:#aaa;">You're receiving this because you're assigned to this task in HQue. You can turn off email notifications in your profile settings.</p>
</div>`
  return { subject: v.subject, html }
}

async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) { console.error('task-reminders: missing Resend API key'); return false }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({ from: 'HQue <noreply@h-que.com>', to, subject, html })
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('task-reminders: Resend error', res.status, body)
  }
  return res.ok
}

async function runReminders() {
  const tomorrow = pacificDate(1)
  const today = pacificDate(0)
  const yesterday = pacificDate(-1)
  const phaseByDate = { [tomorrow]: 'tomorrow', [today]: 'today', [yesterday]: 'overdue' }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, column_id, board_id')
    .in('due_date', [tomorrow, today, yesterday])

  if (!tasks || tasks.length === 0) return { checked: 0, sent: 0 }

  // Work out which columns count as "Done" per board: any column named
  // done/completed/etc., plus the last column on the board.
  const boardIds = [...new Set(tasks.map(t => t.board_id).filter(Boolean))]
  const { data: cols } = await supabase
    .from('board_columns').select('id, name, position, board_id').in('board_id', boardIds)
  const doneColIds = new Set()
  const colsByBoard = {}
  ;(cols || []).forEach(c => { (colsByBoard[c.board_id] = colsByBoard[c.board_id] || []).push(c) })
  Object.values(colsByBoard).forEach(list => {
    let last = list[0]
    list.forEach(c => {
      if (DONE_COLUMN_NAMES.includes((c.name || '').trim().toLowerCase())) doneColIds.add(c.id)
      if (c.position > last.position) last = c
    })
    if (last) doneColIds.add(last.id)
  })

  // Skip tasks that are already finished.
  const openTasks = tasks.filter(t => !doneColIds.has(t.column_id))
  if (openTasks.length === 0) return { checked: tasks.length, sent: 0 }

  // Brand name for each task (task -> board -> brand).
  const openBoardIds = [...new Set(openTasks.map(t => t.board_id).filter(Boolean))]
  const { data: boards } = await supabase.from('boards').select('id, brand_id').in('id', openBoardIds)
  const brandIdByBoard = {}
  ;(boards || []).forEach(b => { brandIdByBoard[b.id] = b.brand_id })
  const brandIds = [...new Set(Object.values(brandIdByBoard).filter(Boolean))]
  const brandNameById = {}
  if (brandIds.length) {
    const { data: brands } = await supabase.from('brands').select('id, name').in('id', brandIds)
    ;(brands || []).forEach(b => { brandNameById[b.id] = b.name })
  }

  // Assignees and their profiles.
  const taskIds = openTasks.map(t => t.id)
  const { data: assignees } = await supabase.from('task_assignees').select('task_id, user_id').in('task_id', taskIds)
  const assigneesByTask = {}
  ;(assignees || []).forEach(a => { (assigneesByTask[a.task_id] = assigneesByTask[a.task_id] || []).push(a.user_id) })
  const userIds = [...new Set((assignees || []).map(a => a.user_id))]
  const profileById = {}
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles').select('id, email, full_name, email_notifications').in('id', userIds)
    ;(profiles || []).forEach(p => { profileById[p.id] = p })
  }

  let sent = 0, skipped = 0
  for (const t of openTasks) {
    const phase = phaseByDate[t.due_date]
    if (!phase) continue
    const brandName = brandNameById[brandIdByBoard[t.board_id]] || ''
    for (const uid of (assigneesByTask[t.id] || [])) {
      const p = profileById[uid]
      if (!p || !p.email || !p.email_notifications) { skipped++; continue }
      const { subject, html } = buildEmail({
        phase,
        name: (p.full_name || p.email).split(' ')[0],
        taskTitle: t.title,
        brandName,
        dueYmd: t.due_date,
        taskId: t.id
      })
      if (await sendEmail(p.email, subject, html)) sent++
      else skipped++
    }
  }
  return { checked: tasks.length, open: openTasks.length, sent, skipped }
}

exports.handler = async () => {
  try {
    const result = await runReminders()
    console.log('task-reminders:', JSON.stringify(result))
    return { statusCode: 200, body: JSON.stringify(result) }
  } catch (err) {
    console.error('task-reminders: failed', err)
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}

// Exported so the preview-reminder function can reuse the same templates.
exports.buildEmail = buildEmail
exports.sendEmail = sendEmail
exports.pacificDate = pacificDate
