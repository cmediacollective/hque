import { supabase } from './supabase'

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Review', 'Hold', 'Done']

const STATUS_TO_COLUMN = {
  'Pitch': 'to do',
  'Active': 'in progress',
  'Pending Payment': 'review',
  'Completed': 'done'
}

const COLUMN_TO_STATUS = {
  'to do': 'Pitch',
  'in progress': 'Active',
  'review': 'Pending Payment',
  'done': 'Completed'
}

async function ensureBoardForCampaign(campaign, orgId) {
  const isInternal = !campaign.brand_id
  let q = supabase.from('boards').select('*').eq('org_id', orgId).neq('status', 'archived').order('created_at', { ascending: true })
  q = isInternal ? q.is('brand_id', null) : q.eq('brand_id', campaign.brand_id)
  const { data: existing } = await q.limit(1).maybeSingle()
  if (existing) return existing
  const boardName = isInternal ? 'Internal' : (campaign.brand || 'Brand')
  const { data: newBoard } = await supabase.from('boards').insert([{ name: boardName, org_id: orgId, brand_id: isInternal ? null : campaign.brand_id, status: 'active' }]).select().single()
  if (newBoard) {
    await supabase.from('board_columns').insert(DEFAULT_COLUMNS.map((name, i) => ({ board_id: newBoard.id, name, position: i })))
  }
  return newBoard
}

async function pickColumnForStatus(boardId, status) {
  const { data: cols } = await supabase.from('board_columns').select('*').eq('board_id', boardId).order('position')
  if (!cols || cols.length === 0) return null
  const targetName = STATUS_TO_COLUMN[status]
  if (targetName) {
    const match = cols.find(c => (c.name || '').trim().toLowerCase() === targetName)
    if (match) return match
  }
  if (status === 'Completed') return cols[cols.length - 1]
  return cols[0]
}

export async function syncCampaignToTask(campaign, orgId) {
  if (!campaign?.id || !orgId) return
  const board = await ensureBoardForCampaign(campaign, orgId)
  if (!board) return
  const column = await pickColumnForStatus(board.id, campaign.status)
  if (!column) return

  const { data: existing } = await supabase.from('tasks').select('id, column_id').eq('campaign_id', campaign.id).maybeSingle()

  if (existing) {
    const update = { title: campaign.name, board_id: board.id }
    if (existing.column_id !== column.id) update.column_id = column.id
    await supabase.from('tasks').update(update).eq('id', existing.id)
    return existing.id
  }

  const { data: peers } = await supabase.from('tasks').select('id').eq('column_id', column.id)
  const position = (peers || []).length

  const { data: inserted } = await supabase.from('tasks').insert([{
    title: campaign.name,
    description: null,
    priority: 'Medium',
    column_id: column.id,
    board_id: board.id,
    org_id: orgId,
    campaign_id: campaign.id,
    position
  }]).select().single()
  return inserted?.id
}

export async function syncTaskColumnToCampaign(taskId, newColumnId) {
  const { data: task } = await supabase.from('tasks').select('campaign_id').eq('id', taskId).maybeSingle()
  if (!task?.campaign_id) return
  const { data: col } = await supabase.from('board_columns').select('name').eq('id', newColumnId).maybeSingle()
  if (!col) return
  const newStatus = COLUMN_TO_STATUS[(col.name || '').trim().toLowerCase()]
  if (!newStatus) return
  await supabase.from('campaigns').update({ status: newStatus }).eq('id', task.campaign_id)
}
