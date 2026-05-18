// Test helper: open this in a browser to receive one sample of each
// reminder email (due tomorrow / due today / overdue), using fake data.
//   /.netlify/functions/preview-reminder?email=you@example.com
const { buildEmail, sendEmail, pacificDate } = require('./task-reminders')

exports.handler = async (event) => {
  const email = ((event.queryStringParameters || {}).email || '').trim()
  if (!email) {
    return { statusCode: 400, headers: { 'Content-Type': 'text/html' },
      body: '<p style="font-family:sans-serif;padding:40px;">Add <code>?email=you@example.com</code> to the URL to get sample reminder emails.</p>' }
  }

  const samples = [
    { phase: 'tomorrow', dueYmd: pacificDate(1) },
    { phase: 'today', dueYmd: pacificDate(0) },
    { phase: 'overdue', dueYmd: pacificDate(-1) }
  ]
  const results = []
  for (const s of samples) {
    const { subject, html } = buildEmail({
      phase: s.phase,
      name: 'there',
      taskTitle: 'Draft the spring campaign brief',
      brandName: 'Sample Brand',
      dueYmd: s.dueYmd,
      taskId: '00000000-0000-0000-0000-000000000000'
    })
    results.push({ phase: s.phase, sent: await sendEmail(email, subject, html) })
  }

  const allOk = results.every(r => r.sent)
  return {
    statusCode: allOk ? 200 : 500,
    headers: { 'Content-Type': 'text/html' },
    body: `<div style="font-family:sans-serif;padding:40px;max-width:480px;margin:0 auto;color:#1A1A1A;">
  <h2 style="font-weight:600;">HQue reminder email preview</h2>
  <p>${allOk
    ? `Sent 3 sample emails to <strong>${email}</strong>. Check that inbox to see how each one looks.`
    : 'Something went wrong sending the samples &mdash; check the Netlify function logs.'}</p>
  <ul>${results.map(r => `<li>${r.phase}: ${r.sent ? 'sent &check;' : 'failed &cross;'}</li>`).join('')}</ul>
</div>`
  }
}
