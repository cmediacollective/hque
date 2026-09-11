import { supabase } from '../supabase'
import { cacheInvalidate } from '../dataCache'
import { noteEntriesFor } from './notes'

// "Make it a campaign": the moment a deal is real, the pitch (or lead) becomes
// an HQue campaign, pre-filled from what Outreach already knows. The campaign
// stores pitch_id and the pitch stores campaign_id — a link each way, no sync.
//
// A brand row and a contact row are found or created so the campaign looks
// exactly like one made by hand: the brand card, the contact on the detail
// page, the talent under campaign_creators.

const escapeLike = (s) => s.replace(/[%_\\]/g, '\\$&')

async function findOrCreateBrand(orgId, pitch) {
  const name = (pitch.brand || '').trim()
  const { data: found } = await supabase
    .from('brands').select('id, name, logo_url, website')
    .eq('org_id', orgId).ilike('name', escapeLike(name)).limit(1).maybeSingle()
  if (found) return found
  const website = pitch.website ? (/^https?:\/\//i.test(pitch.website) ? pitch.website : `https://${pitch.website}`) : null
  const { data, error } = await supabase
    .from('brands').insert({ org_id: orgId, name, website, status: 'active' })
    .select('id, name, logo_url, website').single()
  if (error) throw new Error(`Could not create the brand: ${error.message}`)
  return data
}

async function findOrCreateContact(orgId, brandId, pitch) {
  const name = (pitch.contact || '').trim()
  const email = (pitch.contact_email || '').trim()
  if (!name && !email) return null
  let q = supabase.from('brand_contacts').select('id').eq('org_id', orgId)
  q = email ? q.ilike('email', escapeLike(email)) : q.eq('brand_id', brandId).ilike('name', escapeLike(name))
  const { data: found } = await q.limit(1).maybeSingle()
  if (found) return found.id
  const { data, error } = await supabase
    .from('brand_contacts')
    .insert({ org_id: orgId, brand_id: brandId, name: name || email, email: email || null, type: 'client' })
    .select('id').single()
  if (error) throw new Error(`Could not create the contact: ${error.message}`)
  return data.id
}

/**
 * Create the campaign. Returns the new campaign row. Throws with a readable
 * message; nothing on the pitch is touched here — the caller links it.
 */
export async function createCampaignFromPitch(orgId, pitch, { name, campaign_type, status }) {
  const brand = await findOrCreateBrand(orgId, pitch)
  const contactId = await findOrCreateContact(orgId, brand.id, pitch)
  const latestNote = noteEntriesFor(pitch)[0]?.text || null

  const { data: campaign, error } = await supabase.from('campaigns').insert({
    org_id: orgId,
    name: name.trim(),
    brand_id: brand.id,
    brand: brand.name,
    brand_logo_url: brand.logo_url || null,
    brand_website: brand.website || null,
    contact_id: contactId,
    campaign_type,
    status,
    pitched_by: pitch.pitched_by || null,
    budget: pitch.is_lead && pitch.amount != null ? Number(pitch.amount) : null,
    notes: latestNote,
    pitch_id: pitch.id,
  }).select('id, name, slug').single()
  if (error) throw new Error(`Could not create the campaign: ${error.message}`)

  if (pitch.creator_id) {
    const { error: linkErr } = await supabase
      .from('campaign_creators').insert({ campaign_id: campaign.id, creator_id: pitch.creator_id })
    if (linkErr) throw new Error(`Campaign created, but the talent could not be attached: ${linkErr.message}`)
  }

  // Campaigns and Reports paint from cache; make them refetch.
  cacheInvalidate(`campaigns:${orgId}`)
  cacheInvalidate(`reports:${orgId}`)
  return campaign
}
