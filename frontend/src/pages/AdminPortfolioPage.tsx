import { useEffect, useState } from 'react'
import { saveSiteContent, uploadSiteImage } from '../api/siteContentApi'
import { useAuth } from '../context/AuthContext'
import { useSiteContent } from '../context/SiteContentContext'
import { readFileAsBase64 } from '../lib/fileBase64'
import type { PortfolioItem } from '../types/siteContent'

export function AdminPortfolioPage() {
  const { token } = useAuth()
  const { content, reload, loading } = useSiteContent()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) setItems(structuredClone(content.portfolio))
  }, [content.portfolio, loading])

  async function onUploadForIndex(i: number, file: File) {
    if (!token) {
      setError('Sign in again to upload.')
      return
    }
    setError(null)
    try {
      const b64 = await readFileAsBase64(file)
      const url = await uploadSiteImage(token, file.name, b64)
      setItems((prev) => {
        const next = [...prev]
        next[i] = { ...next[i], src: url }
        return next
      })
      setMessage(`Row ${i + 1}: uploaded ${url}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    setItems((prev) => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function addRow() {
    setItems((prev) => [
      ...prev,
      {
        src: '/images/portfolio/piece-01.png',
        alt: 'New portfolio image',
        captionLabel: '',
        captionSub: '',
      },
    ])
  }

  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function onSave() {
    if (!token) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const next = { ...content, portfolio: items }
      await saveSiteContent(token, next)
      setMessage('Portfolio saved.')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && items.length === 0) {
    return <p className="muted">Loading portfolio…</p>
  }

  return (
    <div className="stack gap-lg admin-cms">
      <div className="stack tight">
        <h1 className="title-lg">Portfolio images</h1>
        <p className="muted small">
          Order matches the homepage: first six tiles in the main grid (with optional
          captions), the rest in the scrolling strip. Upload replacements or paste an
          image URL from your site.
        </p>
      </div>

      {message ? <p className="small text-strong">{message}</p> : null}
      {error ? (
        <p className="error small" role="alert">
          {error}
        </p>
      ) : null}

      <div className="stack gap-md">
        {items.map((row, i) => (
          <div
            key={`${row.src}-${i}`}
            className="card pad stack gap-sm"
            style={{ border: '1px solid var(--rh-line)' }}
          >
            <div className="admin-port-row-head">
              <span className="eyebrow">Piece {i + 1}</span>
              <div className="admin-port-actions">
                <button type="button" className="btn ghost small" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                >
                  ↓
                </button>
                <button type="button" className="btn ghost small" onClick={() => removeRow(i)}>
                  Remove
                </button>
              </div>
            </div>
            <div className="admin-port-preview">
              <img src={row.src} alt="" width={120} height={150} style={{ objectFit: 'cover' }} />
            </div>
            <label className="field">
              <span>Image URL</span>
              <input
                value={row.src}
                onChange={(e) => {
                  const next = [...items]
                  next[i] = { ...next[i], src: e.target.value }
                  setItems(next)
                }}
              />
            </label>
            <label className="field">
              <span>Alt text</span>
              <input
                value={row.alt}
                onChange={(e) => {
                  const next = [...items]
                  next[i] = { ...next[i], alt: e.target.value }
                  setItems(next)
                }}
              />
            </label>
            <label className="field">
              <span>Caption (grid only, first 6)</span>
              <input
                placeholder="Label"
                value={row.captionLabel ?? ''}
                onChange={(e) => {
                  const next = [...items]
                  next[i] = { ...next[i], captionLabel: e.target.value || undefined }
                  setItems(next)
                }}
              />
            </label>
            <label className="field">
              <span>Sub-caption</span>
              <input
                placeholder="Subtitle"
                value={row.captionSub ?? ''}
                onChange={(e) => {
                  const next = [...items]
                  next[i] = { ...next[i], captionSub: e.target.value || undefined }
                  setItems(next)
                }}
              />
            </label>
            <label className="field">
              <span>Upload replace</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onUploadForIndex(i, f)
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="stack gap-sm">
        <button type="button" className="btn ghost" onClick={addRow}>
          Add portfolio row
        </button>
        <button type="button" className="btn" disabled={saving || !token} onClick={() => void onSave()}>
          {saving ? 'Saving…' : 'Save portfolio'}
        </button>
      </div>
    </div>
  )
}
