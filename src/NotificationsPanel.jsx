import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function NotificationsPanel({ user, dark, onClose, onOpenTask }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#888' : '#666'
  const subtle = dark ? '#555' : '#999'

  useEffect(() => { fetchNotifications() }, [])

  async function fetchNotifications() {
    setLoading(true)
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || [])
    setLoading(false)
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  }

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '360px', height: '100vh', background: bg, borderLeft: `0.5px solid ${border}`, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: `0.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text }}>Notifications</div>
            {unread > 0 && <div style={{ fontSize: '10px', color: '#5b7c99', marginTop: '2px' }}>{unread} unread</div>}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {unread > 0 && <button onClick={markAllRead} style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: 'none', color: '#5b7c99', cursor: 'pointer', padding: 0 }}>Mark all read</button>}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: subtle }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ color: '#555', marginBottom: '12px' }}><path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/></svg>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: muted, marginBottom: '6px' }}>All caught up</div>
              <div style={{ fontSize: '12px', color: subtle }}>Notifications will appear here when you are mentioned or assigned to a task.</div>
            </div>
          ) : notifications.map(n => (
            <div key={n.id} onClick={() => { markRead(n.id); if (n.task_id && onOpenTask) { onOpenTask(n.task_id); onClose && onClose() } }} style={{ padding: '14px 20px', borderBottom: `0.5px solid ${border}`, cursor: 'pointer', background: n.read ? 'transparent' : (dark ? 'rgba(91,124,153,0.06)' : 'rgba(91,124,153,0.04)'), display: 'flex', gap: '12px', alignItems: 'flex-start' }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? '#1E1E1E' : '#F0ECE8'}
              onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : (dark ? 'rgba(91,124,153,0.06)' : 'rgba(91,124,153,0.04)')}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.read ? 'transparent' : '#5b7c99', flexShrink: 0, marginTop: '5px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: text, lineHeight: 1.5, marginBottom: '4px' }}>{n.message}</div>
                <div style={{ fontSize: '10px', color: subtle, display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>{timeAgo(n.created_at)}</span>
                  {n.task_id && <span style={{ color: '#5b7c99', letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '9px' }}>Open task →</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
