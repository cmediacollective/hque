import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import SignUp from './SignUp'
import RedeemPage from './RedeemPage'
import InviteRecovery from './InviteRecovery'
import TrialBanner from './TrialBanner'
import AddCreatorForm from './AddCreatorForm'
import NotificationsPanel from './NotificationsPanel'
import MiniCalendar from './MiniCalendar'

// Heavier views and the marketing pages load on demand so the first
// page load only downloads what it actually needs.
const TalentView = lazy(() => import('./TalentView'))
const WorkspaceView = lazy(() => import('./WorkspaceView'))
const CampaignView = lazy(() => import('./CampaignView'))
const ReportsView = lazy(() => import('./ReportsView'))
const SettingsView = lazy(() => import('./SettingsView'))
const InquiriesView = lazy(() => import('./InquiriesView'))
const Onboarding = lazy(() => import('./Onboarding'))
const UpgradeWall = lazy(() => import('./UpgradeWall'))
const PastDueGate = lazy(() => import('./PastDueGate'))
const LandingPage = lazy(() => import('./LandingPage'))
const LegalPage = lazy(() => import('./LegalPage'))
const FAQPage = lazy(() => import('./FAQPage'))
const PricingPage = lazy(() => import('./PricingPage'))
const BlogPage = lazy(() => import('./BlogPage'))
const BlogPostPage = lazy(() => import('./BlogPostPage'))
const TalentInquiry = lazy(() => import('./TalentInquiry'))
const PublicTalentProfile = lazy(() => import('./PublicTalentProfile'))
const ProductUpdates = lazy(() => import('./ProductUpdates'))
const Sandbox = lazy(() => import('./Sandbox'))

// Captured at module load — before anything can clear the URL — so a broken
// magic / invite link (expired or already used) is detected instead of the
// person being silently dropped on the marketing page.
const initialAuthError = (() => {
  try {
    const h = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
    const q = new URLSearchParams(window.location.search || '')
    const err = h.get('error') || q.get('error')
    const code = h.get('error_code') || q.get('error_code')
    if (err || code) return true
  } catch (e) {}
  return false
})()

// Captured at module load — the campaign slug from a /campaign/<slug> share link.
// Resolved to the actual campaign (and opened) once the user is logged in.
const initialCampaignSlug = (() => {
  try {
    const m = (window.location.pathname || '').match(/^\/campaign\/(.+?)\/?$/)
    if (m) return decodeURIComponent(m[1])
  } catch (e) {}
  return null
})()

// Same, for an internal /roster/<slug> talent link (login required — distinct from
// the public /talent/<slug> profile pages).
const initialRosterSlug = (() => {
  try {
    const m = (window.location.pathname || '').match(/^\/roster\/(.+?)\/?$/)
    if (m) return decodeURIComponent(m[1])
  } catch (e) {}
  return null
})()

// And for a /task/<id> link — opens that task in the Workspace.
const initialTaskId = (() => {
  try {
    const m = (window.location.pathname || '').match(/^\/task\/(.+?)\/?$/)
    if (m) return decodeURIComponent(m[1])
  } catch (e) {}
  return null
})()

// Reports route: /reports (admin only) or a month snapshot /reports/<month>-<year>.
const MONTH_SLUGS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const initialReports = (() => {
  try {
    const p = window.location.pathname || ''
    if (p === '/reports' || p === '/reports/') return { month: 'all', year: null }
    const m = p.match(/^\/reports\/([a-z]+)-(\d{4})\/?$/i)
    if (m) {
      const idx = MONTH_SLUGS.indexOf(m[1].slice(0, 3).toLowerCase())
      if (idx >= 0) return { month: idx, year: parseInt(m[2], 10) }
    }
  } catch (e) {}
  return null
})()

function App() {
  const [view, setView] = useState('workspace')
  // Track which top-level views the user has actually opened in this session.
  // Once visited, a view stays mounted (display: none when inactive) so coming
  // back to it doesn't pay the refetch cost. We seed with 'workspace' since
  // that's the default landing.
  const [visited, setVisited] = useState(() => new Set(['workspace']))
  useEffect(() => {
    setVisited(prev => prev.has(view) ? prev : new Set([...prev, view]))
  }, [view])
  const [talentTab, setTalentTab] = useState('roster')
  // Same idea, scoped to the Talent view's sub-tabs.
  const [visitedTalentTabs, setVisitedTalentTabs] = useState(() => new Set(['roster']))
  useEffect(() => {
    setVisitedTalentTabs(prev => prev.has(talentTab) ? prev : new Set([...prev, talentTab]))
  }, [talentTab])

  // Refetch-on-focus: bumped whenever the tab regains visibility after being
  // hidden for at least 30 seconds. Views watch this prop and refetch when it
  // changes — keeps cached data fresh after you come back to the tab.
  const [focusVersion, setFocusVersion] = useState(0)
  const hiddenAtRef = useRef(null)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      } else if (document.visibilityState === 'visible') {
        const wasHiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0
        if (wasHiddenFor > 30000) setFocusVersion(v => v + 1)
        hiddenAtRef.current = null
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  const [showArchived, setShowArchived] = useState(false)
  const [talentView, setTalentView] = useState('grid')
  const [campaignView, setCampaignView] = useState('grid')
  const [previousCampaignView, setPreviousCampaignView] = useState('grid')
  const [showForm, setShowForm] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dark, setDark] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [agencyName, setAgencyName] = useState('HQue')
  const [agencyTz, setAgencyTz] = useState('America/Los_Angeles')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [pendingReports, setPendingReports] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingTaskId, setPendingTaskId] = useState(null)
  const [pendingCampaignId, setPendingCampaignId] = useState(null)
  const [pendingCreatorId, setPendingCreatorId] = useState(null)
  const [pendingBrandNotesId, setPendingBrandNotesId] = useState(null)
  const [trialEndsAt, setTrialEndsAt] = useState(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [pastDueSince, setPastDueSince] = useState(null)
  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showWelcome, setShowWelcome] = useState(false)
  const [agencyLogoUrl, setAgencyLogoUrl] = useState(null)
  const [stripePlan, setStripePlan] = useState(null)
  const [authError, setAuthError] = useState(initialAuthError)

  // A broken magic / invite link leaves an error in the URL — clear it so a
  // refresh doesn't re-trigger the recovery screen.
  useEffect(() => {
    if (initialAuthError) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Detect successful checkout return from Stripe and show welcome modal
  useEffect(() => {
    if (window.location.search.includes('checkout=success')) {
      setShowWelcome(true)
      // Clean the URL so refresh doesn't re-trigger the modal
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [])

  // Deep link: /?task=<id> opens that task in Workspace
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const taskId = params.get('task')
    if (!taskId) return
    setView('workspace')
    setPendingTaskId(taskId)
    params.delete('task')
    const remaining = params.toString()
    const cleanUrl = window.location.pathname + (remaining ? '?' + remaining : '')
    window.history.replaceState({}, '', cleanUrl)
  }, [])

  // Deep link: /?campaign=<id> opens that campaign in Campaigns
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const campaignId = params.get('campaign')
    if (!campaignId) return
    setView('campaigns')
    setPendingCampaignId(campaignId)
    params.delete('campaign')
    const remaining = params.toString()
    const cleanUrl = window.location.pathname + (remaining ? '?' + remaining : '')
    window.history.replaceState({}, '', cleanUrl)
  }, [])

  // Deep link: /campaign/<slug> (pretty share link) → resolve to the campaign and
  // open it. Waits for the user session because campaign reads are row-level secured.
  useEffect(() => {
    if (!user || !initialCampaignSlug) return
    let cancelled = false
    supabase.from('campaigns').select('id').eq('slug', initialCampaignSlug).maybeSingle().then(({ data }) => {
      if (cancelled || !data) return
      setView('campaigns')
      setPendingCampaignId(data.id)
    })
    window.history.replaceState({}, '', '/')
    return () => { cancelled = true }
  }, [user])

  // Deep link: /roster/<slug> (internal talent link) → resolve to the talent and open it.
  useEffect(() => {
    if (!user || !initialRosterSlug) return
    let cancelled = false
    supabase.from('creators').select('id').eq('slug', initialRosterSlug).maybeSingle().then(({ data }) => {
      if (cancelled || !data) return
      setView('talent')
      setTalentTab('roster')
      setPendingCreatorId(data.id)
    })
    window.history.replaceState({}, '', '/')
    return () => { cancelled = true }
  }, [user])

  // Deep link: /task/<id> → open that task in the Workspace.
  useEffect(() => {
    if (!user || !initialTaskId) return
    setView('workspace')
    setPendingTaskId(initialTaskId)
    window.history.replaceState({}, '', '/')
  }, [user])

  const isAdmin = userRole === 'owner' || userRole === 'admin'

  // Reports is admin-only: kick non-admins off the route, and only honor a /reports
  // deep link for admins (no redirect loop when already authenticated as admin).
  useEffect(() => {
    if (!userRole) return // wait until the role is known
    if (!isAdmin && view === 'reports') setView('workspace')
  }, [userRole, view])

  useEffect(() => {
    if (!user || !userRole || !initialReports) return
    if (!isAdmin) { window.history.replaceState({}, '', '/'); return }
    setView('reports')
    setPendingReports(initialReports)
  }, [user, userRole])

  // Deep link: /?brand_notes=<id> opens that brand's notes in Workspace
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const brandId = params.get('brand_notes')
    if (!brandId) return
    setView('workspace')
    setPendingBrandNotesId(brandId)
    params.delete('brand_notes')
    const remaining = params.toString()
    const cleanUrl = window.location.pathname + (remaining ? '?' + remaining : '')
    window.history.replaceState({}, '', cleanUrl)
  }, [])


  useEffect(() => {
    if (!user) return
    window.$crisp = []
    window.CRISP_WEBSITE_ID = '0144cb69-1552-4c18-a032-153183d9030f'
    const s = document.createElement('script')
    s.src = 'https://client.crisp.chat/l.js'
    s.async = true
    document.head.appendChild(s)
    // Identify the user in Crisp
    window.$crisp.push(['set', 'user:email', [user.email]])
  }, [user])

  const bg = dark ? '#1A1A1A' : '#F8F7F3'
  const nav = dark ? '#111111' : '#F0EDE7'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#888' : '#666'
  const subtle = dark ? '#555' : '#999'

  const isSandboxPage = window.location.pathname === '/sandbox'
  const isInquiryPage = window.location.pathname === '/apply' || window.location.search.includes('agency=')
  const isRedeemPage = window.location.pathname === '/redeem'
  const isPrivacyPage = window.location.pathname === '/privacy'
  const isTermsPage = window.location.pathname === '/terms'
  const isUpdatesPage = window.location.pathname === '/updates' || window.location.pathname === '/updates/'
  const isFaqPage = window.location.pathname === '/faq'
  const isPricingPage = window.location.pathname === '/pricing'
  const isBlogPage = window.location.pathname === '/blog'
  const blogPostSlug = window.location.pathname.startsWith('/blog/') ? window.location.pathname.replace('/blog/', '') : null
  const talentProfileSlug = window.location.pathname.startsWith('/talent/')
    ? decodeURIComponent(window.location.pathname.replace('/talent/', '').replace(/\/$/, ''))
    : null
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isInquiryPage) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      // Only update if user actually changed — prevents re-render on token refresh when tab regains focus
      setUser(prev => {
        if (prev?.id === newUser?.id) return prev
        return newUser
      })
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user) fetchProfile() }, [user])

  useEffect(() => {
    if (!user) return
    // Use head + count to skip the row payload — we only need the number.
    const fetchUnread = async () => {
      if (document.visibilityState === 'hidden') return
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setUnreadCount(count || 0)
    }
    fetchUnread()
    // 60s instead of 10s — combined with the focus-return refresh below it
    // still feels prompt without hammering the network in the background.
    const interval = setInterval(fetchUnread, 60000)
    return () => clearInterval(interval)
  }, [user, focusVersion])

  async function fetchProfile() {
    setProfileLoading(true)
    const { data } = await supabase.from('profiles').select('org_id, avatar_url, role').eq('id', user.id).single()
    setUserRole(data?.role || null)

    if (data?.org_id) {
      setOrgId(data.org_id)
      fetchAgencyName(data.org_id)
    } else {
      // No org — ask the server to accept any pending invitation for this email.
      // accept_invitation() attaches the profile and marks the invite accepted
      // in one atomic step, so a half-failed accept can never strand the user.
      const { data: joinedOrgId, error: acceptErr } = await supabase.rpc('accept_invitation')
      if (joinedOrgId) {
        setOrgId(joinedOrgId)
        fetchAgencyName(joinedOrgId)
      } else if (acceptErr) {
        console.error('Could not accept invitation:', acceptErr.message)
      }
    }

    if (data?.avatar_url) setAvatarUrl(data.avatar_url)
    setProfileLoading(false)
  }

  async function fetchAgencyName(oid) {
    const { data } = await supabase.from('org_settings').select('agency_name, agency_logo_url, timezone').eq('org_id', oid).single()
    if (data?.agency_name) setAgencyName(data.agency_name)
    if (data?.agency_logo_url) setAgencyLogoUrl(data.agency_logo_url)
    if (data?.timezone) setAgencyTz(data.timezone)
    const [{ data: org }, { data: master }] = await Promise.all([
      supabase.from('organizations').select('trial_ends_at, stripe_plan, subscription_status, past_due_since, stripe_customer_id').eq('id', oid).single(),
      supabase.rpc('is_platform_admin'),
    ])
    setIsMasterAdmin(master === true)  // master account (HQue creator) — never gated by billing
    if (org?.trial_ends_at) setTrialEndsAt(org.trial_ends_at)
    if (org?.stripe_plan) setStripePlan(org.stripe_plan)
    setSubscriptionStatus(org?.subscription_status || null)
    setPastDueSince(org?.past_due_since || null)
    setStripeCustomerId(org?.stripe_customer_id || null)
  }

  function handleOnboardingComplete(newOrgId, newAgencyName) {
    setOrgId(newOrgId)
    setAgencyName(newAgencyName)
  }

  async function handleLogout() {
    try {
      if (window.$crisp) window.$crisp.push(['do', 'session:reset'])
      const crispScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]')
      if (crispScript) crispScript.remove()
      const crispBox = document.getElementById('crisp-chatbox')
      if (crispBox) crispBox.remove()
      const crispClient = document.getElementById('crisp-client')
      if (crispClient) crispClient.remove()
      window.$crisp = undefined
      window.CRISP_WEBSITE_ID = undefined
    } catch(e) {}
    await supabase.auth.signOut()
    setUser(null)
    setOrgId(null)
  }

  async function handleCSVExport() {
    if (!orgId) return
    const { data: creators } = await supabase.from('creators').select('*').eq('status', 'active').order('name', { ascending: true })
    if (!creators || creators.length === 0) return
    const headers = ['Name', 'Type', 'Niches', 'Instagram', 'TikTok', 'YouTube', 'IG Followers', 'TikTok Followers', 'YT Subscribers', 'Engagement Rate', 'Feed Rate', 'Reel Rate', 'Story Rate', 'TikTok Rate', 'YouTube Rate', 'Location', 'Tier', 'Contact Email', 'Manager', 'Manager Email']
    const rows = creators.map(cr => [
      cr.name || '',
      (Array.isArray(cr.types) ? cr.types.join(', ') : cr.type) || '',
      (Array.isArray(cr.niches) ? cr.niches.join(', ') : '') || '',
      cr.handles?.instagram || '',
      cr.handles?.tiktok || '',
      cr.handles?.youtube || '',
      cr.ig_followers || '',
      cr.tiktok_followers || '',
      cr.yt_subscribers || '',
      cr.engagement_rate || '',
      cr.rates?.feed || '',
      cr.rates?.reel || '',
      cr.rates?.story || '',
      cr.rates?.tiktok || '',
      cr.rates?.youtube || '',
      cr.location || '',
      cr.tier || '',
      cr.contact_email || '',
      cr.manager_name || '',
      cr.manager_email || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`))
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `talent-roster-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  async function handleExport() {
    if (!orgId) return
    setExporting(true)
    const { data: creators } = await supabase.from('creators').select('*').eq('status', 'active').order('name', { ascending: true })
    if (!creators || creators.length === 0) { setExporting(false); return }
    const toImg = (url, name) => url ? `<img src="${url}" alt="${name}" style="width:64px;height:64px;object-fit:cover;border-radius:4px;border:1px solid #e0e0e0;display:block;" onerror="this.style.display='none'" />` : `<div style="width:64px;height:64px;border-radius:4px;border:1px solid #e0e0e0;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:20px;color:#999;">${name?.split(' ').map(n => n[0]).join('').slice(0,2)}</div>`
    const rows = creators.map(c => {
      const type = Array.isArray(c.types) && c.types.length ? c.types.join(', ') : (c.type || '—')
      const niches = Array.isArray(c.niches) && c.niches.length ? c.niches.join(', ') : '—'
      const handles = [c.handles?.instagram && `IG: @${c.handles.instagram}`, c.handles?.tiktok && `TK: @${c.handles.tiktok}`, c.handles?.youtube && `YT: ${c.handles.youtube}`].filter(Boolean).join('<br>')
      const rates = [c.rates?.feed && `Feed: $${Number(c.rates.feed).toLocaleString()}`, c.rates?.reel && `Reel: $${Number(c.rates.reel).toLocaleString()}`, c.rates?.story && `Story: $${Number(c.rates.story).toLocaleString()}`, c.rates?.tiktok && `TikTok: $${Number(c.rates.tiktok).toLocaleString()}`, c.rates?.youtube && `YouTube: $${Number(c.rates.youtube).toLocaleString()}`].filter(Boolean).join('<br>')
      return `<tr><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;">${toImg(c.photo_url, c.name)}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;"><div style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;margin-bottom:3px;">${c.name || '—'}</div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">${type}</div></td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${niches}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${handles || '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#1a1a1a;">${c.ig_followers ? Number(c.ig_followers).toLocaleString() : '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#1a1a1a;">${c.engagement_rate ? `${c.engagement_rate}%` : '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${rates || '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${c.location || '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${c.manager_name ? `<div>${c.manager_name}</div>` : ''}${c.manager_email ? `<div style="color:#888;">${c.manager_email}</div>` : ''}${c.contact_email ? `<div style="color:#888;">${c.contact_email}</div>` : ''}${!c.manager_name && !c.manager_email && !c.contact_email ? '—' : ''}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${c.tier || '—'}</td></tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Talent Roster — ${agencyName}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;background:#fff;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}tr{page-break-inside:avoid;}}</style></head><body><div style="padding:40px 48px;"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1a1a1a;"><div style="display:flex;align-items:center;gap:16px;">${agencyLogoUrl ? `<img src="${agencyLogoUrl}" alt="${agencyName}" style="width:56px;height:56px;object-fit:contain;border:0.5px solid #e0e0e0;border-radius:2px;padding:4px;background:#fff;flex-shrink:0;" />` : ''}<div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#999;margin-bottom:8px;">${agencyName}</div><div style="font-family:Georgia,serif;font-size:28px;color:#1a1a1a;">Talent Roster</div></div></div><div style="text-align:right;"><div style="font-size:11px;color:#999;">${creators.length} creators</div><div style="font-size:11px;color:#999;">${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div></div></div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8f8f8;"><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Photo</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Name</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Niches</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Handles</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Followers</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Eng Rate</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Rates</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Location</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Contact</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Tier</th></tr></thead><tbody>${rows}</tbody></table>${stripePlan !== 'agency' ? '<div style="text-align:center;margin-top:40px;padding-top:20px;border-top:0.5px solid #e0e0e0;font-size:10px;color:#999;letter-spacing:0.12em;">Powered by HQue &middot; h-que.com</div>' : ''}</div></body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 500)
    setExporting(false)
  }

  if (isSandboxPage) return <Sandbox />
  if (isInquiryPage) return <TalentInquiry />
  if (talentProfileSlug) return <PublicTalentProfile slug={talentProfileSlug} />
  if (isUpdatesPage) return <ProductUpdates />
  if (isPrivacyPage) return <LegalPage type='privacy' />
  if (isTermsPage) return <LegalPage type='terms' />

  // Signup/login must be checked BEFORE marketing pages so CTAs work from /pricing, /blog, /faq, etc.
  if (!user && showSignUp) return <SignUp onSignUp={(u) => { setUser(u); setShowSignUp(false) }} />
  if (!user && showLogin) return <Login onLogin={setUser} onShowSignUp={() => { setShowLogin(false); setShowSignUp(true) }} />

  if (isFaqPage) return <FAQPage onGetStarted={() => setShowSignUp(true)} onSignIn={() => setShowLogin(true)} />
  if (isPricingPage) return <PricingPage onGetStarted={() => setShowSignUp(true)} />
  if (blogPostSlug) return <BlogPostPage slug={blogPostSlug} onGetStarted={() => setShowSignUp(true)} />
  if (isBlogPage) return <BlogPage onGetStarted={() => setShowSignUp(true)} />

  if (authLoading || profileLoading) return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )
  // AppSumo redemption — must sit BEFORE the paywall gates below so a buyer
  // whose free trial already lapsed can still reach the page and redeem.
  if (isRedeemPage) return <RedeemPage user={user} orgId={orgId} onSignIn={() => setShowLogin(true)} onSignUp={() => setShowSignUp(true)} />
  if (!user && authError) return <InviteRecovery onBackToSignIn={() => { setAuthError(false); setShowLogin(true) }} />
  if (!user) return <LandingPage onGetStarted={() => setShowSignUp(true)} onSignIn={() => setShowLogin(true)} />
  if (user && !orgId) return <Onboarding user={user} onComplete={handleOnboardingComplete} />
  if (!isMasterAdmin && trialEndsAt && new Date(trialEndsAt) < new Date()) return <UpgradeWall orgId={orgId} user={user} onLogout={handleLogout} />
  if (!isMasterAdmin && subscriptionStatus === 'past_due') return <PastDueGate stripeCustomerId={stripeCustomerId} pastDueSince={pastDueSince} onLogout={handleLogout} />
  if (!isMasterAdmin && subscriptionStatus === 'canceled') return <UpgradeWall orgId={orgId} user={user} onLogout={handleLogout} />

  const navItems = [
    { key: 'workspace', label: 'Workspace', pageLabel: 'Workspace' },
    { key: 'campaigns', label: 'Campaigns', pageLabel: 'Campaigns' },
    { key: 'talent', label: 'Talent', pageLabel: 'Talent' },
    { key: 'reports', label: 'Reports', pageLabel: 'Campaign Report' },
    { key: 'settings', label: 'Settings', pageLabel: 'Settings' },
  ]

  const viewLabel = navItems.find(n => n.key === view)?.pageLabel || navItems.find(n => n.key === view)?.label || 'HQue'

  const viewLoader = (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ fontSize: '9px', color: subtle, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif", overflowX: 'hidden' }}>
      {showForm && <AddCreatorForm orgId={orgId} dark={!dark} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setRefresh(r => r + 1) }} />}
      {showNotifications && <NotificationsPanel user={user} dark={dark} onClose={() => setShowNotifications(false)} onOpenTask={(taskId) => { setView('workspace'); setPendingTaskId(taskId) }} onOpenCampaign={(campaignId) => { setView('campaigns'); setPendingCampaignId(campaignId) }} />}
      {showWelcome && (
        <div onClick={() => setShowWelcome(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '2px', maxWidth: '440px', width: '100%', padding: isMobile ? '40px 28px' : '48px 40px', textAlign: 'center', color: '#F0ECE6' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#5b7c99', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12'/></svg>
            </div>
            <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>Payment Confirmed</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '28px' : '34px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 1.2, marginBottom: '16px' }}>Welcome to HQue.</div>
            <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.7, marginBottom: '32px' }}>Your subscription is active. A receipt has been sent to your email. You can manage your plan any time from Settings → Billing.</div>
            <button onClick={() => setShowWelcome(false)} style={{ padding: '14px 36px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Let's get started</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : 'auto' }}>

        {!isMobile && (
          <nav style={{ width: '200px', background: nav, borderRight: `0.5px solid ${border}`, padding: '24px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '0 0 20px 16px', borderBottom: `0.5px solid ${border}`, marginBottom: '16px' }}>
              <img src="/logo.svg" alt="HQue" style={{ width: '140px', height: 'auto', display: 'block', filter: dark ? 'none' : 'invert(1)' }} />
            </div>
            {[['workspace', 'Workspace'], ['campaigns', 'Campaigns'], ['talent', 'Talent'], ...(isAdmin ? [['reports', 'Reports']] : [])].map(([key, label]) => (
              <button key={key} onClick={() => setView(key)} style={{
                padding: view === key ? '9px 20px 9px 14.5px' : '9px 16px',
                fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
                color: view === key ? text : muted, background: 'none', border: 'none',
                borderLeft: view === key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
                textAlign: 'left', cursor: 'pointer', width: '100%',
                fontWeight: view === key ? '500' : '400'
              }}>{label}</button>
            ))}
            <MiniCalendar dark={dark} agencyTz={agencyTz} />
            <div style={{ marginTop: 'auto', padding: '0 0 12px' }}>
              {view === 'talent' && !isMobile && (
                <div style={{ padding: '8px 16px 4px' }}>
                  <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: '4px', overflow: 'hidden', boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.06)' }}>
                    {['grid', 'list'].map((v, i) => (
                      <button key={v} onClick={() => setTalentView(v)} style={{ flex: 1, padding: '6px 8px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', background: talentView === v ? '#5b7c99' : (dark ? '#242424' : '#FFFFFF'), border: 'none', borderLeft: i === 0 ? 'none' : `0.5px solid ${border}`, color: talentView === v ? '#fff' : muted, cursor: 'pointer', fontWeight: talentView === v ? 500 : 400 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
                    ))}
                  </div>
                </div>
              )}
              {view === 'campaigns' && !isMobile && (
                <div style={{ padding: '8px 16px 4px' }}>
                  <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: '4px', overflow: 'hidden', boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.06)' }}>
                    {['grid', 'list', 'board'].map((v, i) => (
                      <button key={v} onClick={() => setCampaignView(v)} style={{ flex: 1, padding: '6px 8px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', background: campaignView === v ? '#5b7c99' : (dark ? '#242424' : '#FFFFFF'), border: 'none', borderLeft: i === 0 ? 'none' : `0.5px solid ${border}`, color: campaignView === v ? '#fff' : muted, cursor: 'pointer', fontWeight: campaignView === v ? 500 : 400 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setView('settings')} style={{
                width: '100%', textAlign: 'left',
                padding: view === 'settings' ? '9px 20px 9px 14.5px' : '9px 16px',
                fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
                color: view === 'settings' ? text : subtle, background: 'none', border: 'none',
                borderLeft: view === 'settings' ? '1.5px solid #5b7c99' : '1.5px solid transparent',
                cursor: 'pointer', fontWeight: view === 'settings' ? '500' : '400'
              }}>Settings</button>
              <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt='avatar' style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${border}`, flexShrink: 0, cursor: 'pointer' }} onClick={() => setView('settings')} onError={e => e.target.style.display = 'none'} />
                  : <div onClick={() => setView('settings')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5b7c99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', fontFamily: 'Georgia, serif', flexShrink: 0, cursor: 'pointer' }}>
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                }
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  <button onClick={handleLogout} style={{ marginTop: '4px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: 'none', color: subtle, padding: 0, cursor: 'pointer' }}>Sign out</button>
                </div>
              </div>
            </div>
          </nav>
        )}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden', background: bg, minWidth: 0 }}>
          <div style={{ padding: isMobile ? '12px 16px' : '20px 28px 16px', borderBottom: `0.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              {!isMobile && <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '6px' }}>{agencyName}</div>}
              <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '20px' : '26px', fontWeight: 'normal', color: text }}>{viewLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {view === 'campaigns' && (
                <button
                  onClick={() => {
                    if (campaignView === 'archived') setCampaignView(previousCampaignView || 'grid')
                    else { setPreviousCampaignView(campaignView); setCampaignView('archived') }
                  }}
                  style={{ padding: '7px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: campaignView === 'archived' ? '#5b7c99' : (dark ? '#242424' : '#FFFFFF'), border: `1px solid ${campaignView === 'archived' ? '#5b7c99' : border}`, color: campaignView === 'archived' ? '#fff' : muted, cursor: 'pointer', borderRadius: '4px', boxShadow: campaignView === 'archived' ? '0 2px 6px rgba(91,124,153,0.35)' : (dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.06)') }}>
                  {campaignView === 'archived' ? 'Active' : 'Archived'}
                </button>
              )}
              <button onClick={() => setDark(d => !d)} style={{ padding: '7px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: dark ? '#242424' : '#FFFFFF', border: `1px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '4px', boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.06)' }}>
                {dark ? 'Light' : 'Dark'}
              </button>
              <button onClick={() => setShowNotifications(n => !n)} style={{ position: 'relative', background: dark ? '#242424' : '#FFFFFF', border: `1px solid ${border}`, color: muted, cursor: 'pointer', padding: '6px 9px', lineHeight: 1, display: 'flex', alignItems: 'center', borderRadius: '4px', boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.06)' }}><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/></svg>{unreadCount > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#5b7c99', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>}</button>
              {view === 'talent' && talentTab === 'roster' && !isMobile && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowExportMenu(m => !m)} disabled={exporting} style={{ padding: '7px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: dark ? '#242424' : '#FFFFFF', border: `1px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '4px', opacity: exporting ? 0.6 : 1, boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.06)' }}>
                    {exporting ? 'Exporting...' : 'Export ▾'}
                  </button>
                  {showExportMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: dark ? '#1E1E1E' : '#fff', border: `0.5px solid ${border}`, borderRadius: '2px', zIndex: 50, minWidth: '130px', overflow: 'hidden' }}>
                      <button onClick={() => { handleExport(); setShowExportMenu(false) }} style={{ width: '100%', padding: '10px 16px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: 'none', color: muted, cursor: 'pointer', textAlign: 'left', borderBottom: `0.5px solid ${border}` }}>PDF</button>
                      <button onClick={handleCSVExport} style={{ width: '100%', padding: '10px 16px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: 'none', color: muted, cursor: 'pointer', textAlign: 'left' }}>CSV</button>
                    </div>
                  )}
                </div>
              )}
              {view === 'talent' && talentTab === 'roster' && (
                <button onClick={() => setShowForm(true)} style={{ padding: isMobile ? '7px 14px' : '8px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', boxShadow: '0 2px 8px rgba(91,124,153,0.45)' }}>+ Talent</button>
              )}
              {isMobile && (
                <button onClick={handleLogout} style={{ background: 'none', border: `0.5px solid ${border}`, color: muted, fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer', borderRadius: '1px' }}>Sign out</button>
              )}
            </div>
          </div>

          {view === 'talent' && (
            <div style={{ display: 'flex', borderBottom: `0.5px solid ${border}`, background: bg, flexShrink: 0 }}>
              {[['roster', 'Roster'], ['inquiries', 'Inquiries'], ['archived', 'Archived']].map(([key, label]) => (
                <button key={key} onClick={() => setTalentTab(key)} style={{
                  padding: isMobile ? '8px 16px' : '10px 20px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
                  background: 'none', border: 'none',
                  borderBottom: talentTab === key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
                  color: talentTab === key ? text : muted, cursor: 'pointer'
                }}>{label}</button>
              ))}
            </div>
          )}

          <TrialBanner trialEndsAt={trialEndsAt} onUpgrade={() => setView('settings')} />

          <div style={{ flex: 1, overflow: isMobile ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: isMobile ? '70px' : '0' }}>
            <Suspense fallback={viewLoader}>
              {/* Views stay mounted after first visit. The wrapper toggles
                  display so React preserves component state and avoids re-running
                  fetch effects every time the user switches sections. */}
              {visited.has('workspace') && (
                <div style={{ display: view === 'workspace' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                  <WorkspaceView dark={dark} orgId={orgId} userId={user?.id} agencyTz={agencyTz} openTaskId={pendingTaskId} onOpenTaskHandled={() => setPendingTaskId(null)} openBrandNotesId={pendingBrandNotesId} onOpenBrandNotesHandled={() => setPendingBrandNotesId(null)} isMobile={isMobile} focusVersion={focusVersion} />
                </div>
              )}
              {visited.has('talent') && (
                <div style={{ display: view === 'talent' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                  {visitedTalentTabs.has('roster') && (
                    <div style={{ display: talentTab === 'roster' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                      <TalentView key={refresh} dark={dark} orgId={orgId} isMobile={isMobile} showArchived={false} onToggleArchived={() => setTalentTab('archived')} talentView={talentView} focusVersion={focusVersion} openCreatorId={pendingCreatorId} onOpenCreatorHandled={() => setPendingCreatorId(null)} />
                    </div>
                  )}
                  {visitedTalentTabs.has('archived') && (
                    <div style={{ display: talentTab === 'archived' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                      <TalentView key={'archived'} dark={dark} orgId={orgId} isMobile={isMobile} showArchived={true} onToggleArchived={() => setTalentTab('roster')} talentView={talentView} focusVersion={focusVersion} />
                    </div>
                  )}
                  {visitedTalentTabs.has('inquiries') && (
                    <div style={{ display: talentTab === 'inquiries' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                      <InquiriesView dark={dark} orgId={orgId} focusVersion={focusVersion} />
                    </div>
                  )}
                </div>
              )}
              {visited.has('campaigns') && (
                <div style={{ display: view === 'campaigns' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                  <CampaignView dark={dark} orgId={orgId} campaignView={campaignView} openCampaignId={pendingCampaignId} onOpenCampaignHandled={() => setPendingCampaignId(null)} focusVersion={focusVersion} />
                </div>
              )}
              {visited.has('reports') && (
                <div style={{ display: view === 'reports' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                  <ReportsView dark={dark} orgId={orgId} focusVersion={focusVersion} active={view === 'reports'} initialMonth={pendingReports?.month} initialYear={pendingReports?.year} />
                </div>
              )}
              {visited.has('settings') && (
                <div style={{ display: view === 'settings' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                  <SettingsView dark={dark} user={user} orgId={orgId} onAgencyNameChange={setAgencyName} onAvatarChange={setAvatarUrl} />
                </div>
              )}
            </Suspense>
          </div>
        </main>
      </div>

      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: nav, borderTop: `0.5px solid ${border}`, display: 'flex', zIndex: 50 }}>
          {navItems.filter(item => item.key !== 'reports' || isAdmin).map(item => (
            <button key={item.key} onClick={() => setView(item.key)} style={{
              flex: 1, padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px'
            }}>
              <span style={{ fontSize: '16px', lineHeight: 1, opacity: view === item.key ? 1 : 0.5 }}>
                {item.key === 'talent' ? '◉' : item.key === 'campaigns' ? '▦' : item.key === 'workspace' ? '⊞' : item.key === 'reports' ? '▮' : '◎'}
              </span>
              <span style={{ fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: view === item.key ? '#5b7c99' : muted }}>
                {item.label}
              </span>
              {view === item.key && <div style={{ width: '20px', height: '1.5px', background: '#5b7c99', borderRadius: '1px' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
