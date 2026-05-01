import { useEffect, useRef, useState } from 'react'
import { saveSiteContent, uploadSiteImage } from '../api/siteContentApi'
import { useAuth } from '../context/AuthContext'
import { useSiteContent } from '../context/SiteContentContext'
import { readFileAsBase64 } from '../lib/fileBase64'
import type { PortfolioItem } from '../types/siteContent'

const IconUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
)
const IconDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
)
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
)
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
)
const IconUpload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
)

export function AdminPortfolioPage() {
  const { token } = useAuth()
  const { content, reload, loading } = useSiteContent()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!loading) setItems(structuredClone(content.portfolio))
  }, [content.portfolio, loading])

  async function onUploadForIndex(i: number, file: File) {
    if (!token) { setMsg({ text: 'Sign in again to upload.', ok: false }); return }
    setUploading(i); setMsg(null)
    try {
      const b64 = await readFileAsBase64(file)
      const url = await uploadSiteImage(token, file.name, b64)
      setItems((prev) => {
        const next = [...prev]; next[i] = { ...next[i], src: url }; return next
      })
      setMsg({ text: 'Image uploaded.', ok: true })
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Upload failed.', ok: false })
    } finally { setUploading(null) }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    setItems((prev) => {
      const next = [...prev];[next[i], next[j]] = [next[j], next[i]]; return next
    })
  }

  function addRow() {
    setItems((prev) => [...prev, { src: '', alt: 'New portfolio image', captionLabel: '', captionSub: '' }])
  }

  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function onSave() {
    if (!token) return
    setSaving(true); setMsg(null)
    try {
      await saveSiteContent(token, { ...content, portfolio: items })
      setMsg({ text: 'Portfolio saved.', ok: true })
      await reload()
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Save failed.', ok: false })
    } finally { setSaving(false) }
  }

  if (loading && items.length === 0) return <p className="cms-loading">Loading portfolio…</p>

  return (
    <div className="cms">
      <div className="cms-header">
        <h1 className="cms-title">Portfolio</h1>
        <p className="cms-sub">Drag to reorder. First 6 appear in the main grid with captions; the rest go in the scrolling strip.</p>
      </div>

      {/* Grid of portfolio cards */}
      <div className="port-grid">
        {items.map((row, i) => (
          <div key={`${row.src}-${i}`} className="port-card">

            {/* Image preview — click to upload */}
            <div className="port-img-wrap">
              {row.src ? (
                <img src={row.src} alt={row.alt} className="port-img" />
              ) : (
                <div className="port-img-empty">
                  <IconUpload />
                  <span>No image</span>
                </div>
              )}
              {/* hover overlay */}
              <label className="port-img-overlay">
                {uploading === i ? (
                  <span className="port-uploading">Uploading…</span>
                ) : (
                  <><IconUpload /> Replace</>
                )}
                <input
                  ref={(el) => { fileRefs.current[i] = el }}
                  type="file" accept="image/*"
                  className="cms-upload-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void onUploadForIndex(i, f)
                    e.target.value = ''
                  }}
                />
              </label>
              {/* Position badge */}
              <span className="port-badge">{i + 1}{i < 6 ? ' · grid' : ' · strip'}</span>
            </div>

            {/* Controls */}
            <div className="port-controls">
              <div className="port-move-btns">
                <button className="port-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">
                  <IconUp />
                </button>
                <button className="port-icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down">
                  <IconDown />
                </button>
              </div>
              <button className="port-icon-btn port-icon-btn--danger" onClick={() => removeRow(i)} title="Remove">
                <IconTrash />
              </button>
            </div>

            {/* Fields */}
            <div className="port-fields">
              <div className="cms-field">
                <label className="cms-label">Alt text</label>
                <input className="cms-input" value={row.alt} onChange={(e) => {
                  const next = [...items]; next[i] = { ...next[i], alt: e.target.value }; setItems(next)
                }} />
              </div>
              {i < 6 && (
                <div className="cms-row-2">
                  <div className="cms-field">
                    <label className="cms-label">Caption</label>
                    <input className="cms-input" placeholder="Label" value={row.captionLabel ?? ''} onChange={(e) => {
                      const next = [...items]; next[i] = { ...next[i], captionLabel: e.target.value || undefined }; setItems(next)
                    }} />
                  </div>
                  <div className="cms-field">
                    <label className="cms-label">Sub-caption</label>
                    <input className="cms-input" placeholder="Subtitle" value={row.captionSub ?? ''} onChange={(e) => {
                      const next = [...items]; next[i] = { ...next[i], captionSub: e.target.value || undefined }; setItems(next)
                    }} />
                  </div>
                </div>
              )}
            </div>

          </div>
        ))}

        {/* Add card */}
        <button className="port-add-card" onClick={addRow}>
          <IconPlus />
          <span>Add image</span>
        </button>
      </div>

      {/* Sticky save bar */}
      <div className="cms-save-bar">
        {msg && (
          <span className={`cms-save-msg ${msg.ok ? 'cms-save-msg--ok' : 'cms-save-msg--err'}`}>
            {msg.text}
          </span>
        )}
        <button className="cms-save-btn" disabled={saving || !token} onClick={() => void onSave()}>
          {saving ? 'Saving…' : 'Save portfolio'}
        </button>
      </div>
    </div>
  )
}
