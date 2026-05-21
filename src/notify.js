import { supabase } from './supabase'

export async function createNotification(orgId, memberName, type, message, profiles, taskId = null, campaignId = null) {
  const profile = profiles.find(p => (p.full_name || p.email) === memberName)
  if (!profile) return
  const row = { org_id: orgId, user_id: profile.id, type, message, task_id: taskId }
  if (campaignId) row.campaign_id = campaignId
  await supabase.from('notifications').insert([row])
  await fetch('/.netlify/functions/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: profile.id, type, message, task_id: taskId, campaign_id: campaignId }) })
  return profile.id
}

// Notifies every @-mentioned member. Returns the list of mentioned user ids.
export async function parseMentions(text, orgId, message, profiles, taskId = null, campaignId = null) {
  if (!text) return []
  const mentions = text.match(/@([\w. ]+)/g) || []
  const notifiedIds = []
  for (const mention of mentions) {
    const name = mention.slice(1).trim()
    const profile = profiles.find(p => (p.full_name || p.email) === name)
    if (!profile || notifiedIds.includes(profile.id)) continue
    await createNotification(orgId, name, 'mention', message, profiles, taskId, campaignId)
    notifiedIds.push(profile.id)
  }
  return notifiedIds
}

// Silently adds users as watchers of a task (no notification). Used so anyone
// assigned to or @-mentioned in a task automatically follows it.
export async function addTaskWatchers(taskId, userIds) {
  if (!taskId || !userIds || userIds.length === 0) return
  const wanted = [...new Set(userIds.filter(Boolean))]
  const { data: existing } = await supabase.from('task_watchers').select('user_id').eq('task_id', taskId)
  const have = new Set((existing || []).map(r => r.user_id))
  const toAdd = wanted.filter(uid => !have.has(uid))
  if (toAdd.length) await supabase.from('task_watchers').insert(toAdd.map(uid => ({ task_id: taskId, user_id: uid })))
}
