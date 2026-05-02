import { supabase } from './supabase'

export async function createNotification(orgId, memberName, type, message, profiles, taskId = null) {
  const profile = profiles.find(p => (p.full_name || p.email) === memberName)
  if (!profile) return
  await supabase.from('notifications').insert([{ org_id: orgId, user_id: profile.id, type, message, task_id: taskId }])
  await fetch('/.netlify/functions/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: profile.id, type, message }) })
}

export async function parseMentions(text, orgId, message, profiles, taskId = null) {
  if (!text) return
  const mentions = text.match(/@([\w. ]+)/g) || []
  for (const mention of mentions) {
    const name = mention.slice(1).trim()
    await createNotification(orgId, name, 'mention', message, profiles, taskId)
  }
}
