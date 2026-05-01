import { useEffect, useState } from 'react'
import { saveSiteContent, uploadSiteImage } from '../api/siteContentApi'
import { useAuth } from '../context/AuthContext'
import { useSiteContent } from '../context/SiteContentContext'
import { readFileAsBase64 } from '../lib/fileBase64'
import type { SiteContent } from '../types/siteContent'

/* ── SVG icons ── */
const icons = {
  hero:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  ticker:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  about:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  services: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  mood:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  portfolio:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  quote:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>,
  process:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  contact:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  chevronDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevronUp:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  upload:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
}

/* ── Accordion section ── */
function Section({
  title, icon, children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`cms-section ${open ? 'is-open' : ''}`}>
      <button className="cms-section-head" onClick={() => setOpen((o) => !o)}>
        <span className="cms-section-icon">{icon}</span>
        <span className="cms-section-title">{title}</span>
        <span className="cms-section-chevron">{open ? icons.chevronUp : icons.chevronDown}</span>
      </button>
      {open && <div className="cms-section-body">{children}</div>}
    </div>
  )
}

/* ── Field helpers ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cms-field">
      <label className="cms-label">{label}</label>
      <div className="cms-control">{children}</div>
    </div>
  )
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input className="cms-input" value={value} onChange={(e) => onChange(e.target.value)} />
}

function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea className="cms-textarea" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
}

/* Image block: shows preview + upload button, no visible URL field */
function ImageBlock({
  label, src, alt, onSrc, onAlt, onFile,
}: {
  label: string; src: string; alt: string
  onSrc: (v: string) => void; onAlt: (v: string) => void; onFile: (f: File) => void
}) {
  return (
    <div className="cms-img-block">
      <p className="cms-img-block-label">{label}</p>
      {/* Preview */}
      <div className="cms-img-preview">
        {src ? (
          <img src={src} alt={alt} className="cms-img-thumb" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="cms-img-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        )}
        <label className="cms-img-upload-overlay">
          {icons.upload} Replace
          <input type="file" accept="image/*" className="cms-upload-input" onChange={(e) => {
            const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''
          }} />
        </label>
      </div>
      <Field label="Alt text"><TextInput value={alt} onChange={onAlt} /></Field>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */

export function AdminSitePage() {
  const { token } = useAuth()
  const { content, reload, loading } = useSiteContent()
  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!loading) setDraft(structuredClone(content))
  }, [content, loading])

  async function onUpload(file: File, applyUrl: (url: string) => void) {
    if (!token) { setMsg({ text: 'Sign in again to upload.', ok: false }); return }
    setMsg(null)
    try {
      const b64 = await readFileAsBase64(file)
      const url = await uploadSiteImage(token, file.name, b64)
      applyUrl(url)
      setMsg({ text: `Uploaded successfully.`, ok: true })
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Upload failed.', ok: false })
    }
  }

  async function onSave() {
    if (!token || !draft) return
    setSaving(true); setMsg(null)
    try {
      await saveSiteContent(token, draft)
      setMsg({ text: 'Saved — public site will use this on next load.', ok: true })
      await reload()
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Save failed.', ok: false })
    } finally { setSaving(false) }
  }

  if (loading && !draft) return <p className="cms-loading">Loading…</p>
  if (!draft) return null
  const d = draft

  return (
    <div className="cms">
      <div className="cms-header">
        <h1 className="cms-title">Site &amp; copy</h1>
        <p className="cms-sub">Open a section to edit. Hit Save when done.</p>
      </div>

      <div className="cms-sections">

        <Section title="Hero" icon={icons.hero} defaultOpen>
          <Field label="Kicker line">
            <TextInput value={d.hero.kicker} onChange={(v) => setDraft({ ...d, hero: { ...d.hero, kicker: v } })} />
          </Field>
          <div className="cms-row-3">
            <Field label="Before emphasis">
              <TextInput value={d.hero.titleLineBefore} onChange={(v) => setDraft({ ...d, hero: { ...d.hero, titleLineBefore: v } })} />
            </Field>
            <Field label="Emphasized word">
              <TextInput value={d.hero.titleEm} onChange={(v) => setDraft({ ...d, hero: { ...d.hero, titleEm: v } })} />
            </Field>
            <Field label="After emphasis">
              <TextInput value={d.hero.titleLineAfter} onChange={(v) => setDraft({ ...d, hero: { ...d.hero, titleLineAfter: v } })} />
            </Field>
          </div>
          <Field label="Intro paragraph">
            <TextArea value={d.hero.body} onChange={(v) => setDraft({ ...d, hero: { ...d.hero, body: v } })} rows={3} />
          </Field>
          <Field label="Tag on photo">
            <TextInput value={d.hero.tagPrint} onChange={(v) => setDraft({ ...d, hero: { ...d.hero, tagPrint: v } })} />
          </Field>
          <ImageBlock label="Hero image"
            src={d.hero.image.src} alt={d.hero.image.alt}
            onSrc={(v) => setDraft({ ...d, hero: { ...d.hero, image: { ...d.hero.image, src: v } } })}
            onAlt={(v) => setDraft({ ...d, hero: { ...d.hero, image: { ...d.hero.image, alt: v } } })}
            onFile={(f) => void onUpload(f, (url) => setDraft({ ...d, hero: { ...d.hero, image: { ...d.hero.image, src: url } } }))}
          />
          <div className="cms-stats-grid">
            {d.hero.stats.map((row, i) => (
              <div key={i} className="cms-stat-pair">
                <Field label={`Stat ${i + 1}`}>
                  <TextInput value={row.value} onChange={(v) => {
                    const stats = [...d.hero.stats]; stats[i] = { ...stats[i], value: v }
                    setDraft({ ...d, hero: { ...d.hero, stats } })
                  }} />
                </Field>
                <Field label="Label">
                  <TextInput value={row.label} onChange={(v) => {
                    const stats = [...d.hero.stats]; stats[i] = { ...stats[i], label: v }
                    setDraft({ ...d, hero: { ...d.hero, stats } })
                  }} />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Ticker" icon={icons.ticker}>
          <Field label="One phrase per line">
            <TextArea rows={8} value={d.ticker.join('\n')} onChange={(v) =>
              setDraft({ ...d, ticker: v.split('\n').map((s) => s.trim()).filter(Boolean) })
            } />
          </Field>
        </Section>

        <Section title="About" icon={icons.about}>
          <Field label="Eyebrow">
            <TextInput value={d.about.eyebrow} onChange={(v) => setDraft({ ...d, about: { ...d.about, eyebrow: v } })} />
          </Field>
          <div className="cms-row-2">
            <Field label="Name line 1">
              <TextInput value={d.about.nameLine1} onChange={(v) => setDraft({ ...d, about: { ...d.about, nameLine1: v } })} />
            </Field>
            <Field label="Name line 2">
              <TextInput value={d.about.nameLine2} onChange={(v) => setDraft({ ...d, about: { ...d.about, nameLine2: v } })} />
            </Field>
          </div>
          {d.about.paragraphs.map((p, i) => (
            <Field key={i} label={`Paragraph ${i + 1}`}>
              <TextArea rows={3} value={p} onChange={(v) => {
                const paragraphs = [...d.about.paragraphs] as [string, string, string]
                paragraphs[i] = v; setDraft({ ...d, about: { ...d.about, paragraphs } })
              }} />
            </Field>
          ))}
          <Field label="Media caption">
            <TextInput value={d.about.mediaCaption} onChange={(v) => setDraft({ ...d, about: { ...d.about, mediaCaption: v } })} />
          </Field>
          <div className="cms-img-grid">
            {([ ['craftsman','Craftsman photo'], ['guitarHead','Guitar headstock'], ['guitarBody','Guitar body'] ] as const).map(([key, label]) => (
              <ImageBlock key={key} label={label}
                src={d.about.images[key].src} alt={d.about.images[key].alt}
                onSrc={(v) => setDraft({ ...d, about: { ...d.about, images: { ...d.about.images, [key]: { ...d.about.images[key], src: v } } } })}
                onAlt={(v) => setDraft({ ...d, about: { ...d.about, images: { ...d.about.images, [key]: { ...d.about.images[key], alt: v } } } })}
                onFile={(f) => void onUpload(f, (url) => setDraft({ ...d, about: { ...d.about, images: { ...d.about.images, [key]: { ...d.about.images[key], src: url } } } }))}
              />
            ))}
          </div>
          <div className="cms-stats-grid">
            {d.about.stats.map((row, i) => (
              <div key={i} className="cms-stat-pair">
                <Field label={`Stat ${i + 1}`}>
                  <TextInput value={row.value} onChange={(v) => {
                    const stats = [...d.about.stats]; stats[i] = { ...stats[i], value: v }
                    setDraft({ ...d, about: { ...d.about, stats } })
                  }} />
                </Field>
                <Field label="Label">
                  <TextInput value={row.label} onChange={(v) => {
                    const stats = [...d.about.stats]; stats[i] = { ...stats[i], label: v }
                    setDraft({ ...d, about: { ...d.about, stats } })
                  }} />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Services" icon={icons.services}>
          <div className="cms-row-3">
            <Field label="Eyebrow">
              <TextInput value={d.servicesHead.eyebrow} onChange={(v) => setDraft({ ...d, servicesHead: { ...d.servicesHead, eyebrow: v } })} />
            </Field>
            <Field label="Title">
              <TextInput value={d.servicesHead.title} onChange={(v) => setDraft({ ...d, servicesHead: { ...d.servicesHead, title: v } })} />
            </Field>
            <Field label="CTA label">
              <TextInput value={d.servicesHead.ctaLabel} onChange={(v) => setDraft({ ...d, servicesHead: { ...d.servicesHead, ctaLabel: v } })} />
            </Field>
          </div>
          <div className="cms-services-grid">
            {d.services.map((s, i) => (
              <div key={s.n} className="cms-service-card">
                <p className="cms-service-num">0{s.n}</p>
                <Field label="Title">
                  <TextInput value={s.title} onChange={(v) => {
                    const services = [...d.services]; services[i] = { ...services[i], title: v }
                    setDraft({ ...d, services })
                  }} />
                </Field>
                <Field label="Description">
                  <TextArea rows={2} value={s.desc} onChange={(v) => {
                    const services = [...d.services]; services[i] = { ...services[i], desc: v }
                    setDraft({ ...d, services })
                  }} />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Mood board" icon={icons.mood}>
          <label className="cms-toggle">
            <input type="checkbox" checked={d.inspiration.enabled}
              onChange={(e) => setDraft({ ...d, inspiration: { ...d.inspiration, enabled: e.target.checked } })} />
            <span>Show section on site</span>
          </label>
          <ImageBlock label="Mood board image"
            src={d.inspiration.src} alt={d.inspiration.alt}
            onSrc={(v) => setDraft({ ...d, inspiration: { ...d.inspiration, src: v } })}
            onAlt={(v) => setDraft({ ...d, inspiration: { ...d.inspiration, alt: v } })}
            onFile={(f) => void onUpload(f, (url) => setDraft({ ...d, inspiration: { ...d.inspiration, src: url } }))}
          />
        </Section>

        <Section title="Portfolio" icon={icons.portfolio}>
          <div className="cms-row-2">
            <Field label="Eyebrow">
              <TextInput value={d.portfolioHead.eyebrow} onChange={(v) => setDraft({ ...d, portfolioHead: { ...d.portfolioHead, eyebrow: v } })} />
            </Field>
            <Field label="Title">
              <TextInput value={d.portfolioHead.title} onChange={(v) => setDraft({ ...d, portfolioHead: { ...d.portfolioHead, title: v } })} />
            </Field>
          </div>
        </Section>

        <Section title="Quote" icon={icons.quote}>
          <Field label="Quote text">
            <TextArea rows={4} value={d.quote.text} onChange={(v) => setDraft({ ...d, quote: { ...d.quote, text: v } })} />
          </Field>
          <Field label="Attribution">
            <TextInput value={d.quote.attribution} onChange={(v) => setDraft({ ...d, quote: { ...d.quote, attribution: v } })} />
          </Field>
        </Section>

        <Section title="Process" icon={icons.process}>
          <div className="cms-row-2">
            <Field label="Eyebrow">
              <TextInput value={d.processHead.eyebrow} onChange={(v) => setDraft({ ...d, processHead: { ...d.processHead, eyebrow: v } })} />
            </Field>
            <Field label="Title">
              <TextInput value={d.processHead.title} onChange={(v) => setDraft({ ...d, processHead: { ...d.processHead, title: v } })} />
            </Field>
          </div>
          <div className="cms-services-grid">
            {d.process.map((step, i) => (
              <div key={i} className="cms-service-card">
                <p className="cms-service-num">Step {i + 1}</p>
                <Field label="Title">
                  <TextInput value={step.title} onChange={(v) => {
                    const process = [...d.process]; process[i] = { ...process[i], title: v }
                    setDraft({ ...d, process })
                  }} />
                </Field>
                <Field label="Description">
                  <TextArea rows={2} value={step.desc} onChange={(v) => {
                    const process = [...d.process]; process[i] = { ...process[i], desc: v }
                    setDraft({ ...d, process })
                  }} />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Contact & footer" icon={icons.contact}>
          <div className="cms-row-2">
            <Field label="Title line 1">
              <TextInput value={d.contact.titleLine1} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, titleLine1: v } })} />
            </Field>
            <Field label="Title line 2">
              <TextInput value={d.contact.titleLine2} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, titleLine2: v } })} />
            </Field>
          </div>
          <div className="cms-row-2">
            <Field label="Eyebrow">
              <TextInput value={d.contact.eyebrow} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, eyebrow: v } })} />
            </Field>
            <Field label="Form eyebrow">
              <TextInput value={d.contact.formEyebrow} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, formEyebrow: v } })} />
            </Field>
          </div>
          <div className="cms-row-2">
            <Field label="Email">
              <TextInput value={d.contact.email} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, email: v } })} />
            </Field>
            <Field label="Website">
              <TextInput value={d.contact.website} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, website: v } })} />
            </Field>
          </div>
          <div className="cms-row-2">
            <Field label="Studio location">
              <TextInput value={d.contact.studio} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, studio: v } })} />
            </Field>
            <Field label="Mailto subject">
              <TextInput value={d.contact.mailtoSubject} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, mailtoSubject: v } })} />
            </Field>
          </div>
          <div className="cms-row-2">
            <Field label="Instagram URL">
              <TextInput value={d.contact.instagramUrl} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, instagramUrl: v } })} />
            </Field>
            <Field label="Instagram handle">
              <TextInput value={d.contact.instagramHandle} onChange={(v) => setDraft({ ...d, contact: { ...d.contact, instagramHandle: v } })} />
            </Field>
          </div>
          <div className="cms-divider" />
          <div className="cms-row-2">
            <Field label="Footer name">
              <TextInput value={d.footer.name} onChange={(v) => setDraft({ ...d, footer: { ...d.footer, name: v } })} />
            </Field>
            <Field label="Footer tagline">
              <TextInput value={d.footer.tag} onChange={(v) => setDraft({ ...d, footer: { ...d.footer, tag: v } })} />
            </Field>
          </div>
          <Field label="Footer site URL">
            <TextInput value={d.footer.externalSiteUrl} onChange={(v) => setDraft({ ...d, footer: { ...d.footer, externalSiteUrl: v } })} />
          </Field>
          <Field label="Copyright line (use {year})">
            <TextInput value={d.footer.copyLine} onChange={(v) => setDraft({ ...d, footer: { ...d.footer, copyLine: v } })} />
          </Field>
        </Section>

      </div>

      {/* Sticky save bar */}
      <div className="cms-save-bar">
        {msg && (
          <span className={`cms-save-msg ${msg.ok ? 'cms-save-msg--ok' : 'cms-save-msg--err'}`}>
            {msg.text}
          </span>
        )}
        <button className="cms-save-btn" disabled={saving || !token} onClick={() => void onSave()}>
          {saving ? 'Saving…' : 'Save all changes'}
        </button>
      </div>
    </div>
  )
}
