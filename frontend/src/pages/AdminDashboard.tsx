import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchEstimates, type EstimateRow, type LeadStatus } from '../api/estimates'

function timeAgo(iso?: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fullName(row: EstimateRow) {
  const parts = [row.first_name, row.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : row.email ?? '—'
}

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:       { label: 'New',       color: '#1d4ed8', bg: '#dbeafe' },
  contacted: { label: 'Contacted', color: '#b45309', bg: '#fef9c3' },
  quoted:    { label: 'Quoted',    color: '#6d28d9', bg: '#ede9fe' },
  won:       { label: 'Won',       color: '#15803d', bg: '#dcfce7' },
  lost:      { label: 'Lost',      color: '#9f1239', bg: '#ffe4e6' },
}

export function AdminDashboard() {
  const { user, token } = useAuth()
  const [leads, setLeads] = useState<EstimateRow[]>([])

  useEffect(() => {
    if (!token) return
    fetchEstimates(token).then(setLeads).catch(() => null)
  }, [token])

  useEffect(() => {
    if (!token) return
    const onFocus = () => fetchEstimates(token).then(setLeads).catch(() => null)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [token])

  const thisWeek = leads.filter((l) => {
    if (!l.created_at) return false
    return Date.now() - new Date(l.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
  })

  const pipeline: Record<LeadStatus, number> = { new: 0, contacted: 0, quoted: 0, won: 0, lost: 0 }
  for (const l of leads) {
    const s = (l.status ?? 'new') as LeadStatus
    if (s in pipeline) pipeline[s]++
  }

  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const followUps = leads.filter(
    (l) => l.follow_up_at && l.follow_up_at <= in30 && l.status !== 'won' && l.status !== 'lost'
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = user?.email?.split('@')[0] ?? 'Admin'

  return (
    <div className="sd">

      {/* Greeting */}
      <div className="sd-header">
        <div>
          <h1 className="sd-title">{greeting}, {name}</h1>
          <p className="sd-sub">Here's your business at a glance.</p>
        </div>
        <Link to="/admin/leads" className="sd-cta">View leads →</Link>
      </div>

      {/* 4 stats */}
      <div className="sd-stats">
        <div className="sd-stat">
          <p className="sd-stat-n">{leads.length}</p>
          <p className="sd-stat-l">Total leads</p>
        </div>
        <div className="sd-stat">
          <p className="sd-stat-n" style={{ color: '#1d4ed8' }}>{thisWeek.length}</p>
          <p className="sd-stat-l">This week</p>
        </div>
        <div className="sd-stat">
          <p className="sd-stat-n" style={{ color: '#15803d' }}>{pipeline.won}</p>
          <p className="sd-stat-l">Won</p>
        </div>
        <div className="sd-stat" style={{ borderRight: 'none' }}>
          <p className="sd-stat-n" style={{ color: followUps.length > 0 ? '#dc2626' : 'inherit' }}>{followUps.length}</p>
          <p className="sd-stat-l">Follow-ups due</p>
        </div>
      </div>

      <div className="sd-body">

        {/* Pipeline */}
        <section className="sd-card">
          <div className="sd-card-head">
            <h2 className="sd-card-title">Pipeline</h2>
            <Link to="/admin/leads" className="sd-link">Manage →</Link>
          </div>
          <div className="sd-pipeline">
            {(Object.keys(STATUS_META) as LeadStatus[]).map((s) => {
              const meta = STATUS_META[s]
              const count = pipeline[s]
              const max = Math.max(...Object.values(pipeline), 1)
              const pct = Math.round((count / max) * 100)
              return (
                <div key={s} className="sd-pipe-row">
                  <span className="sd-pipe-label">{meta.label}</span>
                  <div className="sd-pipe-track">
                    <div className="sd-pipe-fill" style={{ width: `${pct}%`, background: meta.color }} />
                  </div>
                  <span className="sd-pipe-count" style={{ color: count > 0 ? meta.color : '#94a3b8' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Recent leads */}
        <section className="sd-card">
          <div className="sd-card-head">
            <h2 className="sd-card-title">Recent leads</h2>
            <Link to="/admin/leads" className="sd-link">See all</Link>
          </div>
          <div className="sd-feed">
            {leads.length === 0 ? (
              <p className="sd-empty">No leads yet.</p>
            ) : leads.slice(0, 6).map((row, i) => {
              const s = (row.status ?? 'new') as LeadStatus
              const meta = STATUS_META[s]
              return (
                <div key={row.id ?? i} className="sd-row">
                  <div className="sd-av" style={{ background: meta.bg, color: meta.color }}>
                    {(row.first_name ?? row.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="sd-row-body">
                    <p className="sd-row-name">{fullName(row)}</p>
                    <p className="sd-row-meta">{row.project_type ?? 'General'}</p>
                  </div>
                  <div className="sd-row-right">
                    <span className="sd-pill" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                    <p className="sd-row-time">{timeAgo(row.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Follow-ups */}
        {followUps.length > 0 && (
          <section className="sd-card">
            <div className="sd-card-head">
              <h2 className="sd-card-title">Follow-ups</h2>
              <Link to="/admin/leads" className="sd-link">Open leads →</Link>
            </div>
            <div className="sd-feed">
              {followUps.slice(0, 5).map((row, i) => {
                const overdue = row.follow_up_at! <= today
                return (
                  <div key={row.id ?? i} className="sd-row">
                    <div className="sd-av" style={overdue ? { background: '#ffe4e6', color: '#9f1239' } : { background: '#fef9c3', color: '#b45309' }}>
                      {(row.first_name ?? row.email ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="sd-row-body">
                      <p className="sd-row-name">{fullName(row)}</p>
                      <p className="sd-row-meta" style={{ color: overdue ? '#dc2626' : '#b45309', fontWeight: 600 }}>
                        {overdue ? `Overdue · ${row.follow_up_at}` : `Due ${row.follow_up_at}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
