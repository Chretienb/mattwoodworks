import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchEstimates,
  patchEstimate,
  type EstimateRow,
  type EstimatePatch,
  type LeadStatus,
} from '../api/estimates'

function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function fullName(row: EstimateRow) {
  const parts = [row.first_name, row.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : row.email ?? '—'
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string; bg: string }[] = [
  { value: 'new',       label: 'New',       color: '#1d4ed8', bg: '#dbeafe' },
  { value: 'contacted', label: 'Contacted', color: '#b45309', bg: '#fef9c3' },
  { value: 'quoted',    label: 'Quoted',    color: '#6d28d9', bg: '#ede9fe' },
  { value: 'won',       label: 'Won',       color: '#15803d', bg: '#dcfce7' },
  { value: 'lost',      label: 'Lost',      color: '#9f1239', bg: '#ffe4e6' },
]
function statusMeta(s?: LeadStatus | null) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0]
}

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
)
const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)
const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
)
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.79a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
)

export function AdminLeadsPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState<EstimateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [selected, setSelected] = useState<EstimateRow | null>(null)

  const [draft, setDraft] = useState<EstimatePatch>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchEstimates(token)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error loading leads.'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!selected) { setDraft({}); return }
    setDraft({
      status:         selected.status ?? 'new',
      notes:          selected.notes ?? '',
      quote_amount:   selected.quote_amount ?? undefined,
      quote_sent_at:  selected.quote_sent_at ?? undefined,
      quote_accepted: selected.quote_accepted ?? undefined,
      follow_up_at:   selected.follow_up_at ?? undefined,
    })
    setSaveMsg(null)
  }, [selected?.id])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && (r.status ?? 'new') !== statusFilter) return false
      if (!q) return true
      return [r.first_name, r.last_name, r.email, r.phone, r.project_type, r.message]
        .some((v) => v?.toLowerCase().includes(q))
    })
  }, [rows, search, statusFilter])

  async function handleSave() {
    if (!selected?.id || !token) return
    setSaving(true); setSaveMsg(null)
    try {
      await patchEstimate(token, selected.id, draft)
      setRows((prev) => prev.map((r) => r.id === selected.id ? { ...r, ...draft } : r))
      setSelected((prev) => prev ? { ...prev, ...draft } : null)
      setSaveMsg('Saved!')
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  function pd(u: Partial<EstimatePatch>) { setDraft((d) => ({ ...d, ...u })) }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="leads">

      {/* Header */}
      <div className="leads-header">
        <div>
          <h1 className="leads-title">Leads</h1>
          <p className="leads-sub">{loading ? 'Loading…' : `${rows.length} total · ${filtered.length} shown`}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="leads-toolbar">
        <div className="leads-search-wrap">
          <span className="leads-search-icon"><IconSearch /></span>
          <input
            className="leads-search"
            placeholder="Search by name, email, project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="leads-search-clear" onClick={() => setSearch('')}><IconX /></button>
          )}
        </div>
        <div className="leads-filters">
          {(['all', ...STATUS_OPTIONS.map(o => o.value)] as const).map((s) => {
            const meta = s !== 'all' ? statusMeta(s as LeadStatus) : null
            const active = statusFilter === s
            return (
              <button key={s}
                className={`leads-filter-btn ${active ? 'is-active' : ''}`}
                style={active && meta ? { background: meta.bg, color: meta.color, borderColor: meta.color } : {}}
                onClick={() => setStatusFilter(s as typeof statusFilter)}
              >
                {s === 'all' ? 'All' : meta!.label}
                {s !== 'all' && <span className="leads-filter-count">{rows.filter(r => (r.status ?? 'new') === s).length}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Two-pane */}
      <div className={`leads-panes ${selected ? 'has-detail' : ''}`}>

        {/* List */}
        <div className="leads-list-card">
          {error ? (
            <p className="leads-empty" style={{ color: '#dc2626' }}>{error}</p>
          ) : loading ? (
            <p className="leads-empty">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="leads-empty">{search || statusFilter !== 'all' ? 'No results.' : 'No leads yet.'}</p>
          ) : filtered.map((row, i) => {
            const meta = statusMeta(row.status ?? 'new')
            const followDue = row.follow_up_at && row.follow_up_at <= today
            const isSelected = selected?.id === row.id
            return (
              <button
                key={row.id ?? i}
                className={`leads-row ${isSelected ? 'is-active' : ''}`}
                onClick={() => setSelected(isSelected ? null : row)}
              >
                <div className="leads-av" style={{ background: meta.bg, color: meta.color }}>
                  {(row.first_name ?? row.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="leads-row-body">
                  <div className="leads-row-top">
                    <span className="leads-row-name">{fullName(row)}</span>
                    <span className="leads-pill" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                  </div>
                  <div className="leads-row-bottom">
                    <span className="leads-row-meta">{row.project_type ?? 'General'}</span>
                    {row.follow_up_at && (
                      <span className="leads-row-followup" style={{ color: followDue ? '#dc2626' : '#b45309' }}>
                        Due {row.follow_up_at}
                      </span>
                    )}
                    <span className="leads-row-time">{fmt(row.created_at)}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const meta = statusMeta(selected.status ?? 'new')
          return (
            <div className="leads-detail">

              {/* Detail header */}
              <div className="leads-detail-head">
                <div className="leads-detail-av" style={{ background: meta.bg, color: meta.color }}>
                  {(selected.first_name ?? selected.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="leads-detail-info">
                  <h2 className="leads-detail-name">{fullName(selected)}</h2>
                  <p className="leads-detail-email">{selected.email}</p>
                </div>
                <button className="leads-detail-close" onClick={() => setSelected(null)}><IconX /></button>
              </div>

              {/* Contact buttons */}
              <div className="leads-contact-btns">
                <a href={`mailto:${selected.email}`} className="leads-contact-btn leads-contact-btn--primary">
                  <IconMail /> Email
                </a>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="leads-contact-btn">
                    <IconPhone /> {selected.phone}
                  </a>
                )}
              </div>

              {/* Info grid */}
              <div className="leads-info-grid">
                <InfoItem label="Project">{selected.project_type ?? 'General'}</InfoItem>
                <InfoItem label="Received">{fmt(selected.created_at)} · {fmtTime(selected.created_at)}</InfoItem>
                {selected.phone && <InfoItem label="Phone">{selected.phone}</InfoItem>}
                <InfoItem label="Source">{selected.source ?? 'website'}</InfoItem>
              </div>

              {selected.message && (
                <div className="leads-message">
                  <p className="leads-message-label">Message</p>
                  <p className="leads-message-body">{selected.message}</p>
                </div>
              )}

              {/* CRM section */}
              <div className="leads-crm">
                <p className="leads-crm-label">CRM</p>

                {/* Status */}
                <div className="leads-form-row">
                  <span className="leads-form-label">Status</span>
                  <div className="leads-status-btns">
                    {STATUS_OPTIONS.map((o) => (
                      <button key={o.value}
                        className={`leads-status-btn ${draft.status === o.value ? 'is-active' : ''}`}
                        style={draft.status === o.value ? { background: o.bg, color: o.color, borderColor: o.color } : {}}
                        onClick={() => pd({ status: o.value })}
                      >{o.label}</button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="leads-form-row">
                  <span className="leads-form-label">Notes</span>
                  <textarea className="leads-textarea"
                    placeholder="e.g. called back, waiting on floor plan…"
                    rows={3}
                    value={draft.notes ?? ''}
                    onChange={(e) => pd({ notes: e.target.value })}
                  />
                </div>

                {/* Quote */}
                <div className="leads-form-row">
                  <span className="leads-form-label">Quote</span>
                  <div className="leads-half-row">
                    <div className="leads-input-wrap">
                      <span className="leads-input-prefix">$</span>
                      <input className="leads-input leads-input--prefix" type="number" min="0" step="0.01" placeholder="0.00"
                        value={draft.quote_amount ?? ''}
                        onChange={(e) => pd({ quote_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                      />
                    </div>
                    <input className="leads-input" type="date"
                      value={draft.quote_sent_at?.slice(0, 10) ?? ''}
                      onChange={(e) => pd({ quote_sent_at: e.target.value || undefined })}
                    />
                  </div>
                </div>

                {/* Quote outcome */}
                <div className="leads-form-row">
                  <span className="leads-form-label">Outcome</span>
                  <div className="leads-toggle-group">
                    {[
                      { val: undefined, label: 'Pending', active: '#f1f5f9', color: '#334155', border: '#94a3b8' },
                      { val: true,  label: 'Accepted', active: '#dcfce7', color: '#15803d', border: '#15803d' },
                      { val: false, label: 'Declined', active: '#ffe4e6', color: '#9f1239', border: '#9f1239' },
                    ].map(({ val, label, active, color, border }) => (
                      <button key={label}
                        className={`leads-toggle-btn ${draft.quote_accepted === val ? 'is-active' : ''}`}
                        style={draft.quote_accepted === val ? { background: active, color, borderColor: border } : {}}
                        onClick={() => pd({ quote_accepted: val })}
                      >{label}</button>
                    ))}
                  </div>
                </div>

                {/* Follow-up */}
                <div className="leads-form-row">
                  <span className="leads-form-label">Follow-up</span>
                  <input className="leads-input leads-input--half" type="date"
                    value={draft.follow_up_at ?? ''}
                    onChange={(e) => pd({ follow_up_at: e.target.value || undefined })}
                  />
                </div>

                {/* Save */}
                <div className="leads-save-row">
                  <button className="leads-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  {saveMsg && (
                    <span className={saveMsg === 'Saved!' ? 'leads-msg-ok' : 'leads-msg-err'}>{saveMsg}</span>
                  )}
                </div>
              </div>

            </div>
          )
        })()}
      </div>
    </div>
  )
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="leads-info-item">
      <p className="leads-info-label">{label}</p>
      <p className="leads-info-value">{children}</p>
    </div>
  )
}
