// Read-only health check: `npm run health`. Changes nothing — it builds the
// app, counts code-checker issues, audits add-ons, and pings the live site
// and Supabase, then prints one line per check.
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

function run(cmd, opts = {}) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts }) }
  } catch (e) {
    return { ok: false, out: e.stdout || '', err: e.stderr || '' }
  }
}

// 1. Build — the step that produces the live site.
const build = run('npm run build')
record('App builds', build.ok, build.ok ? 'clean' : (build.out + build.err).split('\n').filter(l => /error/i.test(l)).slice(0, 3).join(' | '))

// 2. Code checker — reports counts; errors here are code-quality, not outages.
const lint = run('npx eslint . -f json')
try {
  const files = JSON.parse(lint.out)
  const msgs = files.flatMap(f => f.messages)
  const hooks = msgs.filter(m => m.ruleId === 'react-hooks/rules-of-hooks').length
  record('Code checker', true, `${msgs.length} issue(s)${hooks ? `, ${hooks} hooks-rule (review)` : ''}`)
} catch {
  record('Code checker', false, 'could not run eslint')
}

// 3. Add-on security audit, for the app and for the server functions.
function audit(label, cwd) {
  const r = run('npm audit --omit=dev --json', { cwd })
  try {
    const v = JSON.parse(r.out).metadata.vulnerabilities
    const serious = v.high + v.critical
    record(label, serious === 0, `${v.critical} critical, ${v.high} high, ${v.moderate} moderate`)
  } catch {
    record(label, false, 'could not run npm audit')
  }
}
audit('Add-ons (app)', '.')
audit('Add-ons (server functions)', 'netlify/functions')

// 4. Live site and Supabase reachability.
async function ping(label, url, init) {
  const t = Date.now()
  try {
    const res = await fetch(url, { redirect: 'follow', ...init })
    record(label, res.ok, `${res.status} in ${Date.now() - t}ms`)
  } catch (e) {
    record(label, false, e.message)
  }
}
await ping('Live site', 'https://h-que.com')
await ping('Live app', 'https://h-que.com/app.html')
await ping('Product Updates page', 'https://h-que.com/updates')

const env = fs.existsSync('.env')
  ? Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
  : {}
if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
  await ping('Supabase sign-in service', `${env.VITE_SUPABASE_URL}/auth/v1/health`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY } })
  await ping('Supabase database', `${env.VITE_SUPABASE_URL}/rest/v1/rpc/get_public_updates`, {
    method: 'POST',
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: '{}',
  })
} else {
  record('Supabase', false, 'no .env with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

console.log('\nHQue health check\n')
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(28)} ${r.detail}`)
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed} check(s) need a look.` : '\nAll checks passed.')
process.exit(failed ? 1 : 0)
